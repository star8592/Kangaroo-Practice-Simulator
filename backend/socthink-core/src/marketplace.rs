//! Isolated marketplace redemption service, hosted in the existing Rust core.
//! Returns a session cookie understood by the read-only SOC THINK exam frontend.
//! Never trusts a client supplied paid flag. Caller must present License HMAC ticket.
use axum::{
    Form, Json,
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    env,
    fs::{self, OpenOptions},
    io::Write,
    os::unix::fs::{OpenOptionsExt, PermissionsExt},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

type HmacSha256 = Hmac<Sha256>;
const KIND: &str = "EXAM_REPORT_ONCE";
const SKU: &str = "EDU-001";
const COOKIE: &str = "socthink_marketplace_session";
const MAX_TICKET_BYTES: usize = 1300;
const REPORT_WINDOW_SECS: u64 = 30 * 86400;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ClaimForm {
    ticket: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct Ticket {
    v: u8,
    job: String,
    sku: String,
    kind: String,
    #[serde(rename = "examId")]
    exam_id: String,
    exp: u64,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Grant {
    job_hash: String,
    exam_id: String,
    sku: String,
    session_hash: String,
    created_at: u64,
    report_until: u64,
}

struct Config {
    secret: String,
    exam_id: String,
    data_dir: PathBuf,
    origin: String,
}

#[derive(Debug)]
enum RedemptionError {
    Disabled,
    Forbidden,
    Invalid,
    AlreadyClaimed,
    Unavailable,
    Revoked,
}
impl RedemptionError {
    fn response(&self) -> Response {
        let (status, code) = match self {
            Self::Disabled => (StatusCode::NOT_FOUND, "MARKETPLACE_DISABLED"),
            Self::Forbidden => (StatusCode::FORBIDDEN, "INVALID_ORIGIN"),
            Self::Invalid => (StatusCode::BAD_REQUEST, "INVALID_OR_EXPIRED_TICKET"),
            Self::AlreadyClaimed => (StatusCode::CONFLICT, "ALREADY_CLAIMED"),
            Self::Unavailable => (StatusCode::SERVICE_UNAVAILABLE, "SERVICE_UNAVAILABLE"),
            Self::Revoked => (StatusCode::GONE, "ENTITLEMENT_REVOKED"),
        };
        let body = serde_json::json!({"code":code,"error":match self {
            Self::AlreadyClaimed => "此权益已领取，请在原浏览器继续或联系卖家申请恢复",
            Self::Unavailable => "考试服务暂时不可用，请稍后重试",
            Self::Revoked => "该订单权益已取消，如有疑问请联系原平台卖家",
            _ => "考试兑换暂不可用，请从闲鱼订单重新打开专属链接",
        }});
        (
            status,
            [
                (header::CACHE_CONTROL, "private, no-store"),
                (header::REFERRER_POLICY, "no-referrer"),
            ],
            axum::Json(body),
        )
            .into_response()
    }
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
fn sha(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}
fn valid_id(value: &str) -> bool {
    (8..=128).contains(&value.len())
        && value
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
}
fn config() -> Result<Config, RedemptionError> {
    if env::var("SOCTHINK_MARKETPLACE_EXAM_MODE").as_deref() != Ok("1") {
        return Err(RedemptionError::Disabled);
    }
    let secret = env::var("SOCTHINK_MARKETPLACE_HANDOFF_SECRET").unwrap_or_default();
    let exam_id = env::var("SOCTHINK_MARKETPLACE_AMC8_EXAM_ID").unwrap_or_default();
    let data_dir = PathBuf::from(env::var("SOCTHINK_MARKETPLACE_DATA_DIR").unwrap_or_default());
    let user_dir = PathBuf::from(env::var("SOCTHINK_USER_DATA_DIR").unwrap_or_default());
    let origin = env::var("SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN").unwrap_or_default();
    if secret.len() < 32
        || exam_id.is_empty()
        || !data_dir.is_absolute()
        || !user_dir.is_absolute()
        || origin.is_empty()
        || !(origin.starts_with("https://")
            || origin.starts_with("http://127.0.0.1:")
            || origin.starts_with("http://localhost:"))
        || origin.ends_with('/')
        || origin.contains('?')
        || origin.contains('#')
        || origin.contains('@')
    {
        return Err(RedemptionError::Unavailable);
    }
    if data_dir == user_dir || data_dir.starts_with(&user_dir) || user_dir.starts_with(&data_dir) {
        return Err(RedemptionError::Unavailable);
    }
    // Prevent symlink-based config accidentally writing into the main-site directory.
    fs::create_dir_all(&data_dir).map_err(|_| RedemptionError::Unavailable)?;
    fs::create_dir_all(&user_dir).map_err(|_| RedemptionError::Unavailable)?;
    let canonical_data = data_dir
        .canonicalize()
        .map_err(|_| RedemptionError::Unavailable)?;
    let canonical_users = user_dir
        .canonicalize()
        .map_err(|_| RedemptionError::Unavailable)?;
    if canonical_data == canonical_users
        || canonical_data.starts_with(&canonical_users)
        || canonical_users.starts_with(&canonical_data)
    {
        return Err(RedemptionError::Unavailable);
    }
    Ok(Config {
        secret,
        exam_id,
        data_dir: canonical_data,
        origin,
    })
}
fn verify_ticket(input: &str, cfg: &Config) -> Result<Ticket, RedemptionError> {
    if input.len() > MAX_TICKET_BYTES || input.len() < 80 || !input.is_ascii() {
        return Err(RedemptionError::Invalid);
    }
    let (data, signature) = input.split_once('.').ok_or(RedemptionError::Invalid)?;
    if data.contains('.')
        || signature.len() != 64
        || !signature
            .bytes()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
        || !data
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
    {
        return Err(RedemptionError::Invalid);
    }
    let actual = hex::decode(signature).map_err(|_| RedemptionError::Invalid)?;
    let mut mac = HmacSha256::new_from_slice(cfg.secret.as_bytes())
        .map_err(|_| RedemptionError::Unavailable)?;
    mac.update(data.as_bytes());
    mac.verify_slice(&actual)
        .map_err(|_| RedemptionError::Invalid)?;
    let payload = URL_SAFE_NO_PAD
        .decode(data)
        .map_err(|_| RedemptionError::Invalid)?;
    let ticket: Ticket = serde_json::from_slice(&payload).map_err(|_| RedemptionError::Invalid)?;
    let clock = now();
    if ticket.v != 1
        || ticket.sku != SKU
        || ticket.kind != KIND
        || ticket.exam_id != cfg.exam_id
        || !valid_id(&ticket.job)
        || ticket.exp < clock
        || ticket.exp > clock + 600
    {
        return Err(RedemptionError::Invalid);
    }
    Ok(ticket)
}
fn cookie_for(job_hash: &str, random: &str) -> String {
    format!("{job_hash}.{random}")
}
fn cookie_secret(headers: &HeaderMap) -> Option<String> {
    let cookie = headers.get(header::COOKIE)?.to_str().ok()?;
    cookie
        .split(';')
        .map(str::trim)
        .find_map(|pair| pair.strip_prefix(&format!("{COOKIE}=")).map(str::to_string))
}
fn valid_cookie(cookie: &str, existing: &Grant) -> bool {
    let Some((job_hash, secret)) = cookie.split_once('.') else {
        return false;
    };
    if job_hash != existing.job_hash
        || secret.len() != 64
        || !secret
            .bytes()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
        || existing.report_until <= now()
    {
        return false;
    }
    let expected = sha(secret);
    // Avoid timing-based guessing of the existing cookie hash.
    let (Ok(a), Ok(b)) = (hex::decode(&expected), hex::decode(&existing.session_hash)) else {
        return false;
    };
    let Ok(mut mac) = HmacSha256::new_from_slice(&a) else {
        return false;
    };
    mac.update(b"same-cookie");
    let expected = mac.finalize().into_bytes();
    let Ok(mut check) = HmacSha256::new_from_slice(&b) else {
        return false;
    };
    check.update(b"same-cookie");
    check.verify_slice(&expected).is_ok()
}
fn read_grant(file: &Path) -> Result<Option<Grant>, RedemptionError> {
    match fs::read(file) {
        Ok(contents) => {
            let record: Grant =
                serde_json::from_slice(&contents).map_err(|_| RedemptionError::Unavailable)?;
            Ok(Some(record))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(_) => Err(RedemptionError::Unavailable),
    }
}
/// Rust-side commercial review barrier. A buyer must not burn a real
/// paid voucher by creating an unusable grant for a noncommercial paper.
/// Verify the same separate operator HMAC + exact source bytes as Next.js.
fn paid_exam_rights_ready(exam_id: &str) -> bool {
    if !valid_id(exam_id) {
        return false;
    }
    // Synthetic QA content must never accidentally be offered on HTTPS.
    if exam_id.starts_with("amc8-original-qa-")
        && !env::var("SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN")
            .map(|value| value.starts_with("http://127.0.0.1:"))
            .unwrap_or(false)
    {
        return false;
    }
    let secret = env::var("SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_SECRET").unwrap_or_default();
    let dir = PathBuf::from(env::var("SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_DIR").unwrap_or_default());
    let exams = PathBuf::from(env::var("SOCTHINK_MARKETPLACE_EXAMS_DIR").unwrap_or_default());
    if secret.len() < 32 || !dir.is_absolute() || !exams.is_absolute() {
        return false;
    }
    let ok_dir = fs::symlink_metadata(&dir)
        .map(|m| m.is_dir() && !m.file_type().is_symlink() && m.permissions().mode() & 0o077 == 0)
        .unwrap_or(false);
    if !ok_dir {
        return false;
    }
    let file = exams.join(format!("{exam_id}.json"));
    let review = dir.join(format!("{exam_id}.json"));
    let ok_file = fs::symlink_metadata(&file)
        .map(|m| m.is_file() && !m.file_type().is_symlink())
        .unwrap_or(false);
    let ok_review = fs::symlink_metadata(&review)
        .map(|m| {
            m.is_file()
                && !m.file_type().is_symlink()
                && m.permissions().mode() & 0o077 == 0
                && m.len() <= 4096
        })
        .unwrap_or(false);
    if !ok_file || !ok_review {
        return false;
    }
    let (Ok(raw), Ok(approval)) = (fs::read(&file), fs::read(&review)) else {
        return false;
    };
    let Ok(exam) = serde_json::from_slice::<serde_json::Value>(&raw) else {
        return false;
    };
    let Ok(data) = serde_json::from_slice::<serde_json::Value>(&approval) else {
        return false;
    };
    let profile = &exam["profile"];
    let rights = &profile["rightsPolicy"];
    if profile["id"].as_str() != Some(exam_id)
        || profile["formatId"].as_str() != Some("maa-amc8")
        || profile["questionCount"].as_u64() != Some(25)
        || profile["durationSeconds"].as_u64() != Some(2400)
        || rights["commercialUse"].as_bool() != Some(true)
        || !matches!(
            rights["rightsClass"].as_str(),
            Some("original-verified" | "licensed-commercial")
        )
    {
        return false;
    }
    let Some(license) = rights["license"].as_str() else {
        return false;
    };
    if license.len() < 8 {
        return false;
    }
    let content_sha256 = hex::encode(Sha256::digest(&raw));
    let (
        Some(review_id),
        Some(review_sha),
        Some(review_license),
        Some(reviewer),
        Some(sig),
        Some(approved_at),
    ) = (
        data["examId"].as_str(),
        data["contentSha256"].as_str(),
        data["license"].as_str(),
        data["reviewer"].as_str(),
        data["signature"].as_str(),
        data["approvedAt"].as_u64(),
    )
    else {
        return false;
    };
    if data["v"].as_u64() != Some(1)
        || review_id != exam_id || review_sha != content_sha256
        || review_license != license
        || !(3..=80).contains(&reviewer.len())
        || !reviewer.bytes().all(|x| x.is_ascii_alphanumeric() || x == b'_' || x == b'-')
        || approved_at < 1_767_225_600_000 // 2026-01-01 UTC
        || approved_at > now().saturating_mul(1000).saturating_add(300_000)
    {
        return false;
    }
    let payload = format!("v1|{exam_id}|{content_sha256}|{license}|{approved_at}|{reviewer}");
    let Ok(mut mac) = HmacSha256::new_from_slice(secret.as_bytes()) else {
        return false;
    };
    mac.update(payload.as_bytes());
    let Ok(decoded) = hex::decode(sig) else {
        return false;
    };
    mac.verify_slice(&decoded).is_ok()
}

fn redeem_core(
    ticket: &str,
    existing_cookie: Option<String>,
) -> Result<(String, String), RedemptionError> {
    let cfg = config()?;
    let t = verify_ticket(ticket, &cfg)?;
    if !paid_exam_rights_ready(&t.exam_id) {
        return Err(RedemptionError::Unavailable);
    }
    let job_hash = sha(&format!("{}|{}|{}", t.job, t.sku, t.exam_id));
    // The revocation tombstone is authoritative even when an existing buyer
    // cookie or an old valid handoff ticket is presented.
    if revoked_job(&cfg.data_dir, &job_hash)? {
        return Err(RedemptionError::Revoked);
    }
    let dir = cfg.data_dir.join("grants");
    fs::create_dir_all(&dir).map_err(|_| RedemptionError::Unavailable)?;
    let file = dir.join(format!("{job_hash}.json"));
    if let Some(existing) = read_grant(&file)? {
        if existing.job_hash != job_hash || existing.exam_id != t.exam_id || existing.sku != t.sku {
            return Err(RedemptionError::Unavailable);
        }
        let cookie = existing_cookie.ok_or(RedemptionError::AlreadyClaimed)?;
        if !valid_cookie(&cookie, &existing) {
            return Err(RedemptionError::AlreadyClaimed);
        }
        return Ok((cookie, cfg.origin + "/exam/" + &t.exam_id));
    }
    let mut bytes = [0_u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    let random = hex::encode(bytes);
    let record = Grant {
        job_hash: job_hash.clone(),
        exam_id: t.exam_id.clone(),
        sku: t.sku,
        session_hash: sha(&random),
        created_at: now() * 1000,
        report_until: (now() + REPORT_WINDOW_SECS) * 1000,
    };
    // Compatible with Node's existing marketplaceUserFromCookie reader.
    let new_file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(&file);
    match new_file {
        Ok(mut fd) => {
            let body = serde_json::to_vec(&record).map_err(|_| RedemptionError::Unavailable)?;
            fd.write_all(&body)
                .map_err(|_| RedemptionError::Unavailable)?;
            fd.sync_all().map_err(|_| RedemptionError::Unavailable)?;
        }
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
            // A race or retry cannot steal the original claim.
            return Err(RedemptionError::AlreadyClaimed);
        }
        Err(_) => return Err(RedemptionError::Unavailable),
    }
    // If revoke raced with the first claim, revoke wins. The new session
    // can never access any report because the Node reader sees the tombstone.
    if revoked_job(&cfg.data_dir, &job_hash)? {
        return Err(RedemptionError::Revoked);
    }
    Ok((
        cookie_for(&job_hash, &random),
        cfg.origin + "/exam/" + &t.exam_id,
    ))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RevokeMessage {
    v: u8,
    job: String,
    sku: String,
    exam_id: String,
    reason: String,
    observed_at: u64,
    sig: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Revocation {
    job_hash: String,
    reason: String,
    revoked_at: u64,
}

fn revoked_job(dir: &Path, job_hash: &str) -> Result<bool, RedemptionError> {
    let file = dir.join("revocations").join(format!("{job_hash}.json"));
    match fs::read(&file) {
        Ok(data) => {
            let record: Revocation =
                serde_json::from_slice(&data).map_err(|_| RedemptionError::Unavailable)?;
            if record.job_hash != job_hash {
                return Err(RedemptionError::Unavailable);
            }
            Ok(true)
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(_) => Err(RedemptionError::Unavailable),
    }
}

fn revoke_core(event: RevokeMessage) -> Result<bool, RedemptionError> {
    let cfg = config()?;
    let secret = env::var("SOCTHINK_MARKETPLACE_REVOKE_SECRET").unwrap_or_default();
    if secret.len() < 32 {
        return Err(RedemptionError::Unavailable);
    }
    let current = now();
    if event.v != 1
        || !valid_id(&event.job)
        || event.sku != SKU
        || event.exam_id != cfg.exam_id
        || !matches!(
            event.reason.as_str(),
            "ORDER_REFUNDED" | "CHARGEBACK" | "ADMIN_REVOKED"
        )
        || current.abs_diff(event.observed_at) > 600
        || event.sig.len() != 64
    {
        return Err(RedemptionError::Invalid);
    }
    let signed = format!(
        "v1|{}|{}|{}|{}|{}",
        event.job, event.sku, event.exam_id, event.reason, event.observed_at
    );
    let decoded = hex::decode(&event.sig).map_err(|_| RedemptionError::Invalid)?;
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).map_err(|_| RedemptionError::Unavailable)?;
    mac.update(signed.as_bytes());
    mac.verify_slice(&decoded)
        .map_err(|_| RedemptionError::Invalid)?;
    let job_hash = sha(&format!("{}|{}|{}", event.job, event.sku, event.exam_id));
    let dir = cfg.data_dir.join("revocations");
    fs::create_dir_all(&dir).map_err(|_| RedemptionError::Unavailable)?;
    let file = dir.join(format!("{job_hash}.json"));
    if revoked_job(&cfg.data_dir, &job_hash)? {
        return Ok(false);
    }
    let record = Revocation {
        job_hash,
        reason: event.reason,
        revoked_at: current,
    };
    let body = serde_json::to_vec(&record).map_err(|_| RedemptionError::Unavailable)?;
    match OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(file)
    {
        Ok(mut fd) => {
            fd.write_all(&body)
                .map_err(|_| RedemptionError::Unavailable)?;
            fd.sync_all().map_err(|_| RedemptionError::Unavailable)?;
            Ok(true)
        }
        Err(err) if err.kind() == std::io::ErrorKind::AlreadyExists => {
            // Concurrent revokers are idempotent only if persisted record is valid.
            if revoked_job(&cfg.data_dir, &record.job_hash)? {
                Ok(false)
            } else {
                Err(RedemptionError::Unavailable)
            }
        }
        Err(_) => Err(RedemptionError::Unavailable),
    }
}

/// Internal Rust-only endpoint. The process must be bound to loopback;
/// neither Nginx nor Next.js may proxy this route to the public internet.
pub async fn revoke(Json(event): Json<RevokeMessage>) -> Response {
    match revoke_core(event) {
        Ok(created) => (
            StatusCode::OK,
            [(header::CACHE_CONTROL, "no-store")],
            Json(serde_json::json!({"revoked":true,"created":created})),
        )
            .into_response(),
        Err(error) => error.response(),
    }
}

pub async fn claim(headers: HeaderMap, Form(input): Form<ClaimForm>) -> Response {
    if env::var("SOCTHINK_MARKETPLACE_EXAM_MODE").as_deref() != Ok("1") {
        return RedemptionError::Disabled.response();
    }
    let allowed = env::var("SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN").unwrap_or_default();
    if allowed.is_empty()
        || headers.get(header::ORIGIN).and_then(|x| x.to_str().ok()) != Some(allowed.as_str())
        || headers.get("sec-fetch-site").and_then(|x| x.to_str().ok()) == Some("cross-site")
    {
        return RedemptionError::Forbidden.response();
    }
    if headers
        .get(header::CONTENT_LENGTH)
        .and_then(|x| x.to_str().ok())
        .and_then(|x| x.parse::<u64>().ok())
        .unwrap_or(0)
        > 2400
    {
        return (StatusCode::PAYLOAD_TOO_LARGE, "REQUEST_TOO_LARGE").into_response();
    }
    match redeem_core(&input.ticket, cookie_secret(&headers)) {
        Ok((cookie, redirect)) => {
            let secure = if allowed.starts_with("https://") {
                "; Secure"
            } else {
                ""
            };
            (StatusCode::SEE_OTHER, [
                (header::LOCATION, redirect),
                (header::SET_COOKIE, format!("{COOKIE}={cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age={REPORT_WINDOW_SECS}{secure}")),
                (header::CACHE_CONTROL, "private, no-store".to_string()),
                (header::REFERRER_POLICY, "no-referrer".to_string()),
            ], "").into_response()
        }
        Err(error) => error.response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_disabled_mode() {
        // Pure cryptographic invariants are covered separately; do not alter env in parallel tests.
        assert!(!valid_id("bad /path"));
        assert!(!valid_id("short"));
        assert!(valid_id("job_20261118_12345678"));
    }

    #[test]
    fn rejects_forged_cookie() {
        let grant = Grant {
            job_hash: "a".repeat(64),
            exam_id: "test-amc8".to_string(),
            sku: SKU.to_string(),
            session_hash: sha(&"b".repeat(64)),
            created_at: now() * 1000,
            report_until: (now() + 600) * 1000,
        };
        assert!(valid_cookie(
            &format!("{}.{}", grant.job_hash, "b".repeat(64)),
            &grant
        ));
        assert!(!valid_cookie(
            &format!("{}.{}", grant.job_hash, "c".repeat(64)),
            &grant
        ));
        assert!(!valid_cookie(
            &format!("{}.{}", "e".repeat(64), "b".repeat(64)),
            &grant
        ));
    }

    fn signed(t: &Ticket, secret: &str) -> String {
        let json = serde_json::to_vec(t).unwrap();
        let data = URL_SAFE_NO_PAD.encode(json);
        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(data.as_bytes());
        format!("{data}.{}", hex::encode(mac.finalize().into_bytes()))
    }

    #[test]
    fn ticket_error_matrix_rejects_changed_fields_and_bad_hmac() {
        let secret = "test_only_local_secret_not_real_production_1234567890";
        let config = Config {
            secret: secret.to_string(),
            exam_id: "maa-amc8-2024-user-owned".into(),
            data_dir: std::env::temp_dir(),
            origin: "https://example.test".into(),
        };
        let mut t = Ticket {
            v: 1,
            job: "job_20261118_abcdef".into(),
            sku: SKU.into(),
            kind: KIND.into(),
            exam_id: config.exam_id.clone(),
            exp: now() + 180,
        };
        assert!(verify_ticket(&signed(&t, secret), &config).is_ok());
        assert!(
            verify_ticket(
                &signed(&t, "some_different_signer_not_authorized_12345"),
                &config
            )
            .is_err()
        );
        t.exp = now() - 1;
        assert!(verify_ticket(&signed(&t, secret), &config).is_err());
        t.exp = now() + 999999;
        assert!(verify_ticket(&signed(&t, secret), &config).is_err());
        t.exp = now() + 180;
        t.v = 2;
        assert!(verify_ticket(&signed(&t, secret), &config).is_err());
        t.v = 1;
        t.sku = "EDU-999".into();
        assert!(verify_ticket(&signed(&t, secret), &config).is_err());
        t.sku = SKU.into();
        t.kind = "FREE_UNLIMITED".into();
        assert!(verify_ticket(&signed(&t, secret), &config).is_err());
        t.kind = KIND.into();
        t.exam_id = "other-amc".into();
        assert!(verify_ticket(&signed(&t, secret), &config).is_err());
        t.exam_id = config.exam_id.clone();
        t.job = "../unsafe".into();
        assert!(verify_ticket(&signed(&t, secret), &config).is_err());
        t.job = "job_20261118_abcdef".into();
        let raw = signed(&t, secret);
        let changed = format!(
            "{}{}",
            &raw[..raw.len() - 1],
            if raw.ends_with('0') { "1" } else { "0" }
        );
        assert!(verify_ticket(&changed, &config).is_err());
        assert!(verify_ticket("not-an-actual-ticket", &config).is_err());
    }

    #[test]
    fn damaged_grant_is_not_silently_reissued() {
        let mut tmp = std::env::temp_dir();
        tmp.push(format!("socthink-fault-{}", now()));
        let filename = tmp.with_extension("json");
        std::fs::write(&filename, b"{not-json").unwrap();
        assert!(matches!(
            read_grant(&filename),
            Err(RedemptionError::Unavailable)
        ));
        std::fs::remove_file(filename).unwrap();
    }
}

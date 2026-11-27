//! Rust-owned, isolated voucher preview API.
//!
//! This module deliberately refuses production configuration. It reads the
//! existing WeChat parent session and site-owner records without modifying
//! them, and uses the central billing database's isolated voucher draft schema.
//! It never creates a second identity store or payment ledger.
use axum::{
    Json, Router,
    body::Bytes,
    extract::{DefaultBodyLimit, Path, Query, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::Sha256;
use sqlx::{PgPool, Row, postgres::PgPoolOptions};
use std::{
    env, fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use url::Url;

type HmacSha256 = Hmac<Sha256>;
const PARENT_SESSION_COOKIE: &str = "socthink_parent_session";
const SESSION_SECRET_FILE: &str = "parent-session-secret.txt";
const PARENTS_FILE: &str = "parents.json";
const SITE_OWNER_FILE: &str = "site-owner-binding.json";

#[derive(Clone)]
pub struct CommerceState {
    pool: PgPool,
    user_data_dir: PathBuf,
    public_origin: String,
    lookup_key: Vec<u8>,
    research_archive_key: Option<Vec<u8>>,
}

impl CommerceState {
    pub async fn from_env() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let node_env = env::var("NODE_ENV").unwrap_or_default();
        let preview_flag = env::var("SOCTHINK_VOUCHER_PREVIEW").unwrap_or_default();
        let database_url = env::var("SOCTHINK_BILLING_DATABASE_URL")?;
        let public_origin = env::var("SOCTHINK_PUBLIC_ORIGIN")?;
        let lookup_key_hex = env::var("SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY")?;
        if !voucher_preview_gate(
            &node_env,
            &preview_flag,
            &database_url,
            &public_origin,
            &lookup_key_hex,
        ) {
            return Err(
                "voucher preview is disabled outside an isolated localhost *_ci database".into(),
            );
        }

        let user_data_dir = PathBuf::from(env::var("SOCTHINK_USER_DATA_DIR")?);
        if !user_data_dir.is_dir()
            || !user_data_dir.join(SESSION_SECRET_FILE).is_file()
            || !user_data_dir.join(PARENTS_FILE).is_file()
        {
            return Err("existing parent identity store is unavailable".into());
        }
        let lookup_key = decode_hex(&lookup_key_hex).ok_or("invalid voucher lookup key")?;
        let research_archive_key = match env::var("SOCTHINK_RESEARCH_ARCHIVE_KEY") {
            Ok(v) => Some(
                decode_hex(&v)
                    .filter(|k| k != &lookup_key)
                    .ok_or("invalid or reused archive key")?,
            ),
            Err(env::VarError::NotPresent) => None,
            Err(e) => return Err(e.into()),
        };
        let pool = PgPoolOptions::new()
            .max_connections(8)
            .connect(&database_url)
            .await?;

        Ok(Self {
            pool,
            user_data_dir,
            public_origin,
            lookup_key,
            research_archive_key,
        })
    }
}

pub fn commerce_router(state: CommerceState) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route("/api/platform/admin/commerce", get(admin_commerce))
        .route(
            "/internal/research/wuhan/archive",
            post(archive_research_report).layer(DefaultBodyLimit::max(262144)),
        )
        .route("/api/platform/billing/exam-access", get(exam_access))
        .route(
            "/api/platform/research/wuhan/reports/{id}",
            get(research_report),
        )
        .route(
            "/api/platform/billing/redeem",
            post(redeem_voucher).layer(DefaultBodyLimit::max(256)),
        )
        .with_state(state)
}

async fn health() -> &'static str {
    "ok"
}

fn voucher_preview_gate(
    node_env: &str,
    preview_flag: &str,
    database_url: &str,
    public_origin: &str,
    lookup_key_hex: &str,
) -> bool {
    if node_env == "production" || preview_flag != "1" || decode_hex(lookup_key_hex).is_none() {
        return false;
    }
    let Ok(database) = Url::parse(database_url) else {
        return false;
    };
    let Ok(origin) = Url::parse(public_origin) else {
        return false;
    };
    let local_database = matches!(database.host_str(), Some("127.0.0.1" | "localhost"));
    let local_origin = matches!(origin.host_str(), Some("127.0.0.1" | "localhost"));
    let isolated_database = database.path().trim_start_matches('/').ends_with("_ci");
    local_database && local_origin && isolated_database
}

fn decode_hex(value: &str) -> Option<Vec<u8>> {
    if value.len() != 64 || !value.bytes().all(|b| b.is_ascii_hexdigit()) {
        return None;
    }
    let mut result = Vec::with_capacity(32);
    for pair in value.as_bytes().chunks_exact(2) {
        let hi = (pair[0] as char).to_digit(16)?;
        let lo = (pair[1] as char).to_digit(16)?;
        result.push(((hi << 4) | lo) as u8);
    }
    Some(result)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionClaims {
    uid: String,
    #[serde(default)]
    ver: Option<u64>,
    exp: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ParentRecord {
    id: String,
    #[serde(default)]
    active: Option<bool>,
    #[serde(default)]
    session_version: Option<u64>,
    #[serde(default)]
    wechat_id: Option<String>,
    #[serde(default)]
    wechat_open_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SiteOwnerBinding {
    version: u8,
    parent_id: String,
    contact_email: String,
    bound_at: f64,
    granted_by_admin_id: String,
}

fn valid_parent_id(value: &str) -> bool {
    let Some(hex) = value.strip_prefix("par_") else {
        return false;
    };
    (16..=48).contains(&hex.len())
        && hex
            .bytes()
            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
}

fn valid_contact_email(value: &str) -> bool {
    if value.len() > 254 || value.chars().any(char::is_whitespace) {
        return false;
    }
    let Some((local, domain)) = value.split_once('@') else {
        return false;
    };
    !local.is_empty()
        && !domain.is_empty()
        && !domain.contains('@')
        && domain.split('.').count() >= 2
        && domain.split('.').all(|part| !part.is_empty())
}

fn valid_site_owner_binding(binding: &SiteOwnerBinding, user_id: &str) -> bool {
    binding.version == 1
        && valid_parent_id(&binding.parent_id)
        && binding.parent_id == user_id
        && valid_contact_email(&binding.contact_email)
        && binding.bound_at.is_finite()
        && !binding.granted_by_admin_id.trim().is_empty()
}

fn cookie_value(headers: &HeaderMap, name: &str) -> Option<String> {
    let raw = headers.get(header::COOKIE)?.to_str().ok()?;
    raw.split(';').find_map(|part| {
        let (key, value) = part.trim().split_once('=')?;
        (key == name).then(|| value.trim().to_string())
    })
}

fn current_parent(headers: &HeaderMap, state: &CommerceState) -> Option<ParentRecord> {
    let token = cookie_value(headers, PARENT_SESSION_COOKIE)?;
    if token.len() > 4096 {
        return None;
    }
    let (body, signature) = token.split_once('.')?;
    if body.is_empty() || signature.is_empty() || signature.contains('.') {
        return None;
    }

    let secret = fs::read_to_string(state.user_data_dir.join(SESSION_SECRET_FILE)).ok()?;
    let signature_bytes = URL_SAFE_NO_PAD.decode(signature).ok()?;
    let mut mac = HmacSha256::new_from_slice(secret.trim().as_bytes()).ok()?;
    mac.update(body.as_bytes());
    mac.verify_slice(&signature_bytes).ok()?;

    let claims: SessionClaims = serde_json::from_slice(&URL_SAFE_NO_PAD.decode(body).ok()?).ok()?;
    let now = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_secs();
    if claims.uid.is_empty() || claims.exp < now {
        return None;
    }

    let parents_raw = fs::read_to_string(state.user_data_dir.join(PARENTS_FILE)).ok()?;
    let parents: Vec<ParentRecord> = serde_json::from_str(&parents_raw).ok()?;
    let user = parents.into_iter().find(|p| p.id == claims.uid)?;
    if user.active.unwrap_or(true) == false
        || user.session_version.unwrap_or(1).max(1) != claims.ver.unwrap_or(1)
        || !(user
            .wechat_id
            .as_deref()
            .is_some_and(|v| !v.trim().is_empty())
            || user
                .wechat_open_id
                .as_deref()
                .is_some_and(|v| !v.trim().is_empty()))
    {
        return None;
    }
    Some(user)
}

fn is_site_owner(user: &ParentRecord, state: &CommerceState) -> bool {
    let raw = match fs::read_to_string(state.user_data_dir.join(SITE_OWNER_FILE)) {
        Ok(value) => value,
        Err(_) => return false,
    };
    serde_json::from_str::<SiteOwnerBinding>(&raw)
        .map(|binding| valid_site_owner_binding(&binding, &user.id))
        .unwrap_or(false)
}

fn private_json(status: StatusCode, body: Value) -> Response {
    let mut response = (status, Json(body)).into_response();
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store, max-age=0"),
    );
    response
        .headers_mut()
        .insert(header::VARY, HeaderValue::from_static("Cookie"));
    response
}

// This route exists only inside the already gated localhost commerce preview.
// No public upload or caller-supplied owner; the research archive cannot bill.
async fn research_report(
    State(state): State<CommerceState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let user = match auth_or_response(&headers, &state) {
        Ok(u) => u,
        Err(r) => return r,
    };
    if id.len() != 32
        || !id
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return private_json(StatusCode::NOT_FOUND, json!({"code":"REPORT_NOT_FOUND"}));
    }
    let result = sqlx::query_scalar::<_, Option<Value>>(
        "SELECT exam_access_draft.read_research_report($1,$2)",
    )
    .bind(&user.id)
    .bind(&id)
    .fetch_one(&state.pool)
    .await;
    match result {
        Ok(Some(report)) => private_json(StatusCode::OK, report),
        Ok(None) => private_json(StatusCode::NOT_FOUND, json!({"code":"REPORT_NOT_FOUND"})),
        Err(_) => private_json(
            StatusCode::SERVICE_UNAVAILABLE,
            json!({"code":"TEMPORARILY_UNAVAILABLE"}),
        ),
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ResearchArchiveEnvelope {
    owner_id: String,
    report: Value,
}
// Isolated loopback service-to-service transport only; do not add a Next rewrite.
// Signed body includes the account binding and complete immutable payload.
async fn archive_research_report(
    State(state): State<CommerceState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let Some(key) = state.research_archive_key.as_ref() else {
        return private_json(StatusCode::NOT_FOUND, json!({"code":"DISABLED"}));
    };
    if headers.contains_key(header::ORIGIN) || headers.contains_key(header::COOKIE) {
        return private_json(StatusCode::FORBIDDEN, json!({"code":"INTERNAL_ONLY"}));
    }
    let signature = headers
        .get("x-research-signature")
        .and_then(|v| v.to_str().ok())
        .and_then(decode_hex);
    let mut mac = HmacSha256::new_from_slice(key).expect("validated key");
    mac.update(b"wuhan-research-archive-v1\0");
    mac.update(&body);
    if !signature.is_some_and(|sig| mac.verify_slice(&sig).is_ok()) {
        return private_json(
            StatusCode::UNAUTHORIZED,
            json!({"code":"INVALID_SIGNATURE"}),
        );
    }
    let Ok(envelope) = serde_json::from_slice::<ResearchArchiveEnvelope>(&body) else {
        return private_json(StatusCode::BAD_REQUEST, json!({"code":"INVALID_REPORT"}));
    };
    let Some(id) = envelope.report.get("attempt_id").and_then(Value::as_str) else {
        return private_json(StatusCode::BAD_REQUEST, json!({"code":"INVALID_REPORT"}));
    };
    if !valid_parent_id(&envelope.owner_id)
        || id.len() != 32
        || !id
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return private_json(StatusCode::BAD_REQUEST, json!({"code":"INVALID_REPORT"}));
    }
    let parents = fs::read_to_string(state.user_data_dir.join(PARENTS_FILE))
        .ok()
        .and_then(|s| serde_json::from_str::<Vec<ParentRecord>>(&s).ok());
    if !parents.is_some_and(|ps| {
        ps.iter().any(|p| {
            p.id == envelope.owner_id
                && p.active.unwrap_or(true)
                && (p.wechat_id.as_deref().is_some_and(|s| !s.trim().is_empty())
                    || p.wechat_open_id
                        .as_deref()
                        .is_some_and(|s| !s.trim().is_empty()))
        })
    }) {
        return private_json(StatusCode::FORBIDDEN, json!({"code":"UNKNOWN_ACCOUNT"}));
    }
    // Reject malformed arrays before the SQL constraint's jsonb_array_length.
    if envelope
        .report
        .get("items")
        .and_then(Value::as_array)
        .is_none_or(|v| v.len() != 18)
    {
        return private_json(StatusCode::BAD_REQUEST, json!({"code":"INVALID_REPORT"}));
    }
    let result = sqlx::query_scalar::<_, String>(
        "SELECT exam_access_draft.archive_research_report($1,$2,$3)",
    )
    .bind(&envelope.owner_id)
    .bind(id)
    .bind(&envelope.report)
    .fetch_one(&state.pool)
    .await;
    match result.as_deref() {
        Ok("archived" | "already_archived") => private_json(
            StatusCode::OK,
            json!({"code":result.unwrap(),"attempt_id":id,"billable":false}),
        ),
        Ok("conflict") => private_json(StatusCode::CONFLICT, json!({"code":"REPORT_CONFLICT"})),
        Ok("invalid") => private_json(StatusCode::BAD_REQUEST, json!({"code":"INVALID_REPORT"})),
        _ => private_json(
            StatusCode::SERVICE_UNAVAILABLE,
            json!({"code":"TEMPORARILY_UNAVAILABLE"}),
        ),
    }
}

fn auth_or_response(headers: &HeaderMap, state: &CommerceState) -> Result<ParentRecord, Response> {
    current_parent(headers, state)
        .ok_or_else(|| private_json(StatusCode::UNAUTHORIZED, json!({"code":"LOGIN_REQUIRED"})))
}

#[derive(Debug, Deserialize)]
struct AdminFilters {
    state: Option<String>,
    q: Option<String>,
}

fn parse_admin_filters(input: AdminFilters) -> (String, String) {
    let state = match input.state.as_deref() {
        Some("unclaimed" | "activated" | "expired" | "refunded" | "inconsistent") => {
            input.state.unwrap()
        }
        _ => "all".to_string(),
    };
    let q = input
        .q
        .unwrap_or_default()
        .trim()
        .chars()
        .take(128)
        .collect::<String>();
    (state, q)
}

async fn admin_commerce(
    State(state): State<CommerceState>,
    Query(filters): Query<AdminFilters>,
    headers: HeaderMap,
) -> Response {
    let user = match auth_or_response(&headers, &state) {
        Ok(user) => user,
        Err(response) => return response,
    };
    if !is_site_owner(&user, &state) {
        return private_json(StatusCode::FORBIDDEN, json!({"code":"FORBIDDEN"}));
    }
    let (filter_state, q) = parse_admin_filters(filters);
    let result = sqlx::query(
        r#"
        WITH vouchers AS (
          SELECT u.channel,u.merchant_id,u.order_line_id,u.unit_index,u.sku,u.owner_id,
           r.central_order_id,r.amount_minor,u.capacity,g.capacity-g.used AS remaining,u.expires_at,u.paid_at,
           CASE WHEN u.revoked_at IS NOT NULL OR o.state='refunded' THEN 'refunded'
            WHEN u.expires_at<=now() THEN 'expired'
            WHEN u.claimed_at IS NOT NULL AND o.state='paid' AND g.revoked_at IS NULL AND g.source_order_id IS NOT NULL THEN 'activated'
            WHEN u.claimed_at IS NULL AND r.central_order_id IS NULL THEN 'unclaimed'
            ELSE 'inconsistent' END AS status
          FROM voucher_draft.units u JOIN voucher_draft.order_receipts r USING(channel,merchant_id,order_line_id,unit_index)
          LEFT JOIN billing_orders o ON o.id=r.central_order_id
          LEFT JOIN exam_access_draft.grants g ON g.source_order_id=r.central_order_id
        ), counts AS (
          SELECT count(*)::int AS total,
           count(*) FILTER(WHERE status='unclaimed')::int AS unclaimed,
           count(*) FILTER(WHERE status='activated')::int AS activated,
           count(*) FILTER(WHERE status='expired')::int AS expired,
           count(*) FILTER(WHERE status='refunded')::int AS refunded,
           count(*) FILTER(WHERE status='inconsistent')::int AS inconsistent,
           COALESCE(sum(amount_minor) FILTER(WHERE status='unclaimed'),0)::text AS unclaimed_paid_minor
          FROM vouchers
        ), selected AS (
          SELECT channel,merchant_id,order_line_id,unit_index,sku,owner_id,central_order_id,status,
           amount_minor::text,capacity,remaining,expires_at::text AS expires_at
          FROM vouchers WHERE ($1='all' OR status=$1)
          AND ($2='' OR order_line_id=$2 OR central_order_id=$2 OR owner_id=$2)
          ORDER BY paid_at DESC,channel,merchant_id,order_line_id,unit_index LIMIT 100
        )
        SELECT (SELECT row_to_json(counts) FROM counts)::jsonb AS counts,
         COALESCE((SELECT json_agg(selected) FROM selected),'[]'::json)::jsonb AS rows
        "#,
    )
    .bind(&filter_state)
    .bind(&q)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => {
            let counts: Value = match row.try_get("counts") {
                Ok(value) => value,
                Err(_) => {
                    return private_json(
                        StatusCode::SERVICE_UNAVAILABLE,
                        json!({"code":"TEMPORARILY_UNAVAILABLE"}),
                    );
                }
            };
            let rows: Value = match row.try_get("rows") {
                Ok(value) => value,
                Err(_) => {
                    return private_json(
                        StatusCode::SERVICE_UNAVAILABLE,
                        json!({"code":"TEMPORARILY_UNAVAILABLE"}),
                    );
                }
            };
            private_json(
                StatusCode::OK,
                json!({
                    "counts": counts,
                    "rows": rows,
                    "state": filter_state,
                    "q": q,
                    "limit": 100,
                    "preview": true
                }),
            )
        }
        Err(_) => private_json(
            StatusCode::SERVICE_UNAVAILABLE,
            json!({"code":"TEMPORARILY_UNAVAILABLE"}),
        ),
    }
}

async fn exam_access(State(state): State<CommerceState>, headers: HeaderMap) -> Response {
    let user = match auth_or_response(&headers, &state) {
        Ok(user) => user,
        Err(response) => return response,
    };
    let result = sqlx::query(
        r#"
        SELECT
          COALESCE((SELECT sum(remaining) FROM exam_access_draft.active_grants
            WHERE owner_id=$1 AND exam_key='wuhan-2027'),0)::text AS remaining,
          COALESCE((SELECT array_agg(paper_id ORDER BY paper_id) FROM exam_access_draft.paper_registry
            WHERE exam_key='wuhan-2027'
            AND exam_access_draft.can_open_paper($1,exam_key,paper_id)),ARRAY[]::text[]) AS papers,
          (SELECT count(*)::int FROM exam_access_draft.active_grants
            WHERE owner_id=$1 AND exam_key='wuhan-2027') AS active_cards
        "#,
    )
    .bind(&user.id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => {
            let remaining: String = row.try_get("remaining").unwrap_or_else(|_| "0".to_string());
            let papers: Vec<String> = row.try_get("papers").unwrap_or_default();
            let active_cards: i32 = row.try_get("active_cards").unwrap_or(0);
            private_json(
                StatusCode::OK,
                json!({
                    "examKey": "wuhan-2027",
                    "remainingScoredAttempts": remaining.parse::<i64>().unwrap_or(0),
                    "availablePaperIds": papers,
                    "activeCards": active_cards,
                    "preview": true
                }),
            )
        }
        Err(_) => private_json(
            StatusCode::SERVICE_UNAVAILABLE,
            json!({"code":"TEMPORARILY_UNAVAILABLE"}),
        ),
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RedeemBody {
    code: String,
}

fn valid_preview_code(code: &str) -> bool {
    let Some(rest) = code.strip_prefix("SOC-1-") else {
        return false;
    };
    rest.len() == 32
        && rest
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}

fn lookup_digest(code: &str, key: &[u8]) -> Option<String> {
    let mut mac = HmacSha256::new_from_slice(key).ok()?;
    mac.update(b"soc-voucher-lookup\0");
    mac.update(code.as_bytes());
    Some(
        mac.finalize()
            .into_bytes()
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect(),
    )
}

async fn redeem_voucher(
    State(state): State<CommerceState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    if body.len() > 256 {
        return private_json(
            StatusCode::PAYLOAD_TOO_LARGE,
            json!({"code":"INVALID_CODE"}),
        );
    }
    let origin = headers
        .get(header::ORIGIN)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let fetch_site = headers
        .get("sec-fetch-site")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if origin != state.public_origin || fetch_site == "cross-site" {
        return private_json(StatusCode::FORBIDDEN, json!({"code":"INVALID_ORIGIN"}));
    }
    let user = match auth_or_response(&headers, &state) {
        Ok(user) => user,
        Err(response) => return response,
    };
    let request: RedeemBody = match serde_json::from_slice(&body) {
        Ok(value) => value,
        Err(_) => return private_json(StatusCode::BAD_REQUEST, json!({"code":"INVALID_CODE"})),
    };
    let code = request.code.trim();
    if !valid_preview_code(code) {
        return private_json(StatusCode::BAD_REQUEST, json!({"code":"INVALID_CODE"}));
    }
    let Some(digest) = lookup_digest(code, &state.lookup_key) else {
        return private_json(StatusCode::BAD_REQUEST, json!({"code":"INVALID_CODE"}));
    };
    let result = sqlx::query("SELECT voucher_draft.claim_exam($1,$2) AS result")
        .bind(digest)
        .bind(&user.id)
        .fetch_one(&state.pool)
        .await;
    match result {
        Ok(row) => match row.try_get::<String, _>("result").as_deref() {
            Ok("claimed" | "already_claimed") => {
                private_json(StatusCode::OK, json!({"code":"ACTIVATED"}))
            }
            _ => private_json(StatusCode::CONFLICT, json!({"code":"VOUCHER_UNAVAILABLE"})),
        },
        Err(_) => private_json(
            StatusCode::SERVICE_UNAVAILABLE,
            json!({"code":"TEMPORARILY_UNAVAILABLE"}),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn site_owner_binding_matches_existing_fail_closed_validation() {
        let valid = SiteOwnerBinding {
            version: 1,
            parent_id: "par_aaaaaaaaaaaaaaaa".to_string(),
            contact_email: "owner@example.test".to_string(),
            bound_at: 1.0,
            granted_by_admin_id: "admin-fixture".to_string(),
        };
        assert!(valid_site_owner_binding(&valid, "par_aaaaaaaaaaaaaaaa"));
        assert!(!valid_site_owner_binding(&valid, "par_bbbbbbbbbbbbbbbb"));
        let mut malformed = SiteOwnerBinding { ..valid };
        malformed.version = 2;
        assert!(!valid_site_owner_binding(
            &malformed,
            "par_aaaaaaaaaaaaaaaa"
        ));
        let mut malformed = SiteOwnerBinding {
            version: 1,
            parent_id: "par_AAAAAAAAAAAAAAAA".to_string(),
            contact_email: "owner@example.test".to_string(),
            bound_at: 1.0,
            granted_by_admin_id: "admin-fixture".to_string(),
        };
        assert!(!valid_site_owner_binding(
            &malformed,
            "par_AAAAAAAAAAAAAAAA"
        ));
        malformed.parent_id = "par_aaaaaaaaaaaaaaaa".to_string();
        malformed.contact_email = "not-an-email".to_string();
        assert!(!valid_site_owner_binding(
            &malformed,
            "par_aaaaaaaaaaaaaaaa"
        ));
    }

    #[test]
    fn preview_gate_is_local_ci_only() {
        let key = "ab".repeat(32);
        assert!(voucher_preview_gate(
            "development",
            "1",
            "postgres://localhost/wuhan_ci",
            "http://localhost:3000",
            &key
        ));
        assert!(!voucher_preview_gate(
            "production",
            "1",
            "postgres://localhost/wuhan_ci",
            "http://localhost:3000",
            &key
        ));
        assert!(!voucher_preview_gate(
            "development",
            "1",
            "postgres://db.example/wuhan_ci",
            "http://localhost:3000",
            &key
        ));
        assert!(!voucher_preview_gate(
            "development",
            "1",
            "postgres://localhost/production",
            "http://localhost:3000",
            &key
        ));
        assert!(!voucher_preview_gate(
            "development",
            "0",
            "postgres://localhost/wuhan_ci",
            "http://localhost:3000",
            &key
        ));
    }

    #[test]
    fn admin_filter_accepts_inconsistent_status() {
        let (state, q) = parse_admin_filters(AdminFilters {
            state: Some("inconsistent".to_string()),
            q: Some(" order-line ".to_string()),
        });
        assert_eq!(state, "inconsistent");
        assert_eq!(q, "order-line");
    }

    #[test]
    fn voucher_code_format_is_strict() {
        assert!(valid_preview_code("SOC-1-0123456789abcdefghijklmnopqrstuv"));
        assert!(!valid_preview_code(
            "SOC-2-0123456789abcdefghijklmnopqrstuv"
        ));
        assert!(!valid_preview_code("SOC-1-0123456789abcdefghijklmnopqrstu"));
        assert!(!valid_preview_code(
            "SOC-1-0123456789abcdefghijklmnopqrstuv="
        ));
    }

    #[test]
    fn lookup_digest_is_domain_separated_and_deterministic() {
        let key = vec![7u8; 32];
        let one = lookup_digest("SOC-1-0123456789abcdefghijklmnopqrstuv", &key).unwrap();
        let two = lookup_digest("SOC-1-0123456789abcdefghijklmnopqrstuv", &key).unwrap();
        assert_eq!(one, two);
        assert_eq!(one.len(), 64);
        assert_ne!(
            one,
            lookup_digest("SOC-1-0123456789abcdefghijklmnopqrstuv", &[8u8; 32]).unwrap()
        );
    }
}

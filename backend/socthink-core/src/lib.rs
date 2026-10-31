//! SOCTHINK Rust R1: one read-only catalog adapter.
//!
//! The authoritative training-readiness decision is in
//! `src/lib/training-question-bank.ts`. This Rust module accepts ONLY the
//! already-gated public metadata snapshot built by the existing TypeScript
//! adapter, never original questions, answers, users, scores or payment data.
//! No new production endpoint is activated until a separate parity release.

use std::collections::HashSet;
use std::error::Error;
use std::fs;
use std::path::Path;
use std::sync::{Arc, RwLock};

use axum::{
    Json, Router,
    extract::{Query, State},
    routing::get,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResourceListing {
    pub id: String,
    pub title_zh: String,
    pub title_en: String,
    pub competition: String,
    pub competition_zh: String,
    pub year: Option<i32>,
    pub grade_band: Option<String>,
    pub grade_zh: String,
    pub grade_en: String,
    pub paper_type: String,
    pub question_count: u32,
    pub duration_minutes: Option<u32>,
    pub exam_url: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CatalogSnapshot {
    pub version: u32,
    pub generated_at: String,
    pub rows: Vec<ResourceListing>,
}

#[derive(Clone, Debug)]
pub struct CatalogIndex {
    pub generated_at: String,
    rows: Vec<ResourceListing>,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    #[serde(default)]
    pub query: Option<String>,
    #[serde(default)]
    pub competition: Option<String>,
    #[serde(default)]
    pub grade_band: Option<String>,
    #[serde(default)]
    pub paper_type: Option<String>,
    #[serde(default)]
    pub limit: Option<usize>,
    #[serde(default)]
    pub offset: Option<usize>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub total: usize,
    pub offset: usize,
    pub limit: usize,
    pub has_more: bool,
    pub items: Vec<ResourceListing>,
}

fn valid_row(row: &ResourceListing) -> bool {
    if row.id.trim().is_empty()
        || row.title_zh.trim().is_empty()
        || row.title_en.trim().is_empty()
        || row.question_count == 0
        || !row.exam_url.starts_with("/exam/")
        || row.exam_url.starts_with("//")
        || row.exam_url.contains("..")
        || row.exam_url.contains('?')
        || row.exam_url.contains('#')
        || row.exam_url.contains("//")
    {
        return false;
    }
    matches!(
        row.paper_type.as_str(),
        "past" | "sample" | "smart" | "practice" | "unspecified"
    )
}

impl CatalogIndex {
    pub fn from_snapshot(snapshot: CatalogSnapshot) -> Result<Self, String> {
        if snapshot.version != 1 {
            return Err("unsupported catalog snapshot version".into());
        }
        if snapshot.generated_at.is_empty()
            || snapshot.rows.is_empty()
            || snapshot.rows.len() > 200_000
        {
            return Err("catalog timestamp missing or capacity exceeded".into());
        }
        let mut seen = HashSet::new();
        for row in &snapshot.rows {
            if !valid_row(row) || !seen.insert(&row.id) {
                return Err(format!(
                    "invalid or duplicate resource metadata: {}",
                    row.id
                ));
            }
        }
        Ok(Self {
            generated_at: snapshot.generated_at,
            rows: snapshot.rows,
        })
    }

    pub fn load(path: impl AsRef<Path>) -> Result<Self, Box<dyn Error + Send + Sync>> {
        let raw = fs::read_to_string(path)?;
        let snapshot: CatalogSnapshot = serde_json::from_str(&raw)?;
        Ok(Self::from_snapshot(snapshot)?)
    }

    pub fn search(&self, params: &SearchQuery) -> SearchResult {
        // No unbounded list responses; all entrypoints have a strict cap.
        let limit = params.limit.unwrap_or(20).clamp(1, 100);
        let offset = params.offset.unwrap_or(0).min(200_000);
        let needle = params.query.as_deref().unwrap_or("").trim().to_lowercase();
        let matches: Vec<&ResourceListing> = self
            .rows
            .iter()
            .filter(|row| {
                if params
                    .competition
                    .as_deref()
                    .is_some_and(|c| !c.is_empty() && row.competition != c)
                {
                    return false;
                }
                if params
                    .grade_band
                    .as_deref()
                    .is_some_and(|g| !g.is_empty() && row.grade_band.as_deref() != Some(g))
                {
                    return false;
                }
                if params
                    .paper_type
                    .as_deref()
                    .is_some_and(|p| !p.is_empty() && row.paper_type != p)
                {
                    return false;
                }
                if needle.is_empty() {
                    return true;
                }
                [
                    row.title_zh.as_str(),
                    row.title_en.as_str(),
                    row.competition_zh.as_str(),
                    row.competition.as_str(),
                    row.grade_zh.as_str(),
                    row.grade_en.as_str(),
                    row.id.as_str(),
                ]
                .iter()
                .any(|text| text.to_lowercase().contains(&needle))
                    || row
                        .year
                        .is_some_and(|year| year.to_string().contains(&needle))
            })
            .collect();
        let total = matches.len();
        let items = matches
            .into_iter()
            .skip(offset)
            .take(limit)
            .cloned()
            .collect::<Vec<_>>();
        SearchResult {
            total,
            offset,
            limit,
            has_more: offset.saturating_add(items.len()) < total,
            items,
        }
    }

    pub fn len(&self) -> usize {
        self.rows.len()
    }

    pub fn is_empty(&self) -> bool {
        self.rows.is_empty()
    }
}

/// One in-process catalog reader. Every request snapshots one Arc; successful
/// refresh swaps the entire validated index, never partial data. No polling.
#[derive(Clone)]
pub struct CatalogHandle {
    current: Arc<RwLock<Arc<CatalogIndex>>>,
}

impl CatalogHandle {
    pub fn new(index: CatalogIndex) -> Self {
        Self {
            current: Arc::new(RwLock::new(Arc::new(index))),
        }
    }

    pub fn search(&self, params: &SearchQuery) -> SearchResult {
        let index = self.current.read().expect("catalog lock poisoned").clone();
        index.search(params)
    }

    pub fn len(&self) -> usize {
        self.current.read().expect("catalog lock poisoned").len()
    }

    pub fn is_empty(&self) -> bool {
        self.current
            .read()
            .expect("catalog lock poisoned")
            .is_empty()
    }

    pub fn reload(&self, path: impl AsRef<Path>) -> Result<usize, String> {
        // Parse/validate *before* the exclusive lock. Bad/missing snapshots
        // cannot remove the last valid searchable directory.
        let next = CatalogIndex::load(path).map_err(|e| e.to_string())?;
        let len = next.len();
        *self.current.write().map_err(|_| "catalog lock poisoned")? = Arc::new(next);
        Ok(len)
    }
}

async fn list_resources(
    State(handle): State<CatalogHandle>,
    Query(params): Query<SearchQuery>,
) -> Json<SearchResult> {
    Json(handle.search(&params))
}

async fn health() -> &'static str {
    "ok"
}

pub fn router(index: CatalogIndex) -> Router {
    router_with_handle(CatalogHandle::new(index))
}

pub fn router_with_handle(handle: CatalogHandle) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route("/v1/catalog/resources", get(list_resources))
        .with_state(handle)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> CatalogIndex {
        CatalogIndex::from_snapshot(
            serde_json::from_str(include_str!("../tests/fixtures/catalog.json")).unwrap(),
        )
        .unwrap()
    }

    #[test]
    fn can_filter_bilingual_metadata_without_exposing_licensing() {
        let catalog = fixture();
        assert_eq!(catalog.len(), 2);
        let query = SearchQuery {
            query: Some("AMC".into()),
            grade_band: Some("5-6".into()),
            ..Default::default()
        };
        let response = catalog.search(&query);
        assert_eq!(response.total, 1);
        assert_eq!(response.items[0].id, "au-amc-2024-primary");
        assert!(
            !serde_json::to_string(&response)
                .unwrap()
                .contains("rightsPolicy")
        );
        assert!(
            !serde_json::to_string(&response)
                .unwrap()
                .contains("sourceFile")
        );
    }

    #[test]
    fn query_year_type_competition_and_empty() {
        let index = fixture();
        assert_eq!(
            index
                .search(&SearchQuery {
                    query: Some("2023".into()),
                    ..Default::default()
                })
                .total,
            1
        );
        assert_eq!(
            index
                .search(&SearchQuery {
                    competition: Some("maa-amc".into()),
                    ..Default::default()
                })
                .total,
            1
        );
        assert_eq!(
            index
                .search(&SearchQuery {
                    paper_type: Some("past".into()),
                    ..Default::default()
                })
                .total,
            1
        );
        assert_eq!(
            index
                .search(&SearchQuery {
                    query: Some("没有这个".into()),
                    ..Default::default()
                })
                .total,
            0
        );
        assert_eq!(index.search(&SearchQuery::default()).total, 2);
    }

    #[test]
    fn protects_page_limits() {
        let index = fixture();
        let r = index.search(&SearchQuery {
            limit: Some(10_000),
            offset: Some(1),
            ..Default::default()
        });
        assert_eq!(r.limit, 100);
        assert_eq!(r.total, 2);
        assert_eq!(r.items.len(), 1);
        assert!(!r.has_more);
    }

    #[test]
    fn failed_refresh_preserves_last_good_snapshot() {
        let handle = CatalogHandle::new(fixture());
        let empty_query = SearchQuery::default();
        assert_eq!(handle.search(&empty_query).total, 2);

        let temporary = std::env::temp_dir().join(format!(
            "socthink-invalid-catalog-{}-{}.json",
            std::process::id(),
            std::thread::current().name().unwrap_or("unnamed")
        ));
        std::fs::write(
            &temporary,
            r#"{"version":99,"generatedAt":"today","rows":[]}"#,
        )
        .expect("write invalid test snapshot");
        assert!(handle.reload(&temporary).is_err());
        assert_eq!(handle.search(&empty_query).total, 2);

        std::fs::write(
            &temporary,
            r#"{"version":1,"generatedAt":"2026-10-31","rows":[]}"#,
        )
        .expect("write empty catalog");
        assert!(handle.reload(&temporary).is_err());
        assert_eq!(handle.search(&empty_query).total, 2);

        std::fs::write(&temporary, include_str!("../tests/fixtures/catalog.json"))
            .expect("write valid test snapshot");
        assert_eq!(handle.reload(&temporary).unwrap(), 2);
        assert_eq!(handle.search(&empty_query).total, 2);
        std::fs::remove_file(temporary).expect("remove test snapshot");
    }

    #[test]
    fn rejects_malformed_duplicates_private_fields_and_bad_routes() {
        let raw = include_str!("../tests/fixtures/catalog.json");
        let mut duplicate: CatalogSnapshot = serde_json::from_str(raw).unwrap();
        duplicate.rows.push(duplicate.rows[0].clone());
        assert!(CatalogIndex::from_snapshot(duplicate).is_err());
        let mut bad: CatalogSnapshot = serde_json::from_str(raw).unwrap();
        bad.rows[0].exam_url = "//malicious.example".into();
        assert!(CatalogIndex::from_snapshot(bad).is_err());
        let private_json = raw.replace("\"examUrl\"", "\"rightsPolicy\":{},\"examUrl\"");
        assert!(serde_json::from_str::<CatalogSnapshot>(&private_json).is_err());
    }
}

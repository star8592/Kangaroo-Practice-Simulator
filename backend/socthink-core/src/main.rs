use socthink_rust_core::{CatalogIndex, router};
use std::{env, error::Error, net::SocketAddr};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    let path = env::var("SOCTHINK_CATALOG_SNAPSHOT")
        .map_err(|_| "SOCTHINK_CATALOG_SNAPSHOT is required; no placeholder catalog is served")?;
    let bind: SocketAddr = env::var("SOCTHINK_RUST_BIND")
        .unwrap_or_else(|_| "127.0.0.1:37871".to_string())
        .parse()?;
    if !bind.ip().is_loopback() {
        return Err("R1 is internal-only; refusing a non-loopback bind".into());
    }
    let index = CatalogIndex::load(path)?;
    println!(
        "SOCTHINK_CATALOG_R1_READY rows={} (read-only, internal)",
        index.len()
    );
    let listener = tokio::net::TcpListener::bind(bind).await?;
    axum::serve(listener, router(index)).await?;
    Ok(())
}

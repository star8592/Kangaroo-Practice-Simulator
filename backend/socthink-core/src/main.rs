use socthink_rust_core::{CatalogHandle, CatalogIndex, router_with_handle};
use std::{env, error::Error, net::SocketAddr};
use tokio::signal::unix::{SignalKind, signal};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    let path = env::var("SOCTHINK_CATALOG_SNAPSHOT")
        .map_err(|_| "SOCTHINK_CATALOG_SNAPSHOT is required; no placeholder catalog is served")?;
    let bind: SocketAddr = env::var("SOCTHINK_RUST_BIND")
        .unwrap_or_else(|_| "127.0.0.1:37871".to_string())
        .parse()?;
    if !bind.ip().is_loopback() {
        return Err("R2 is internal-only; refusing non-loopback bind".into());
    }
    let handle = CatalogHandle::new(CatalogIndex::load(&path)?);
    let mut sighup = signal(SignalKind::hangup())?;
    let refresh_handle = handle.clone();
    tokio::spawn(async move {
        while sighup.recv().await.is_some() {
            match refresh_handle.reload(&path) {
                Ok(count) => eprintln!("SOCTHINK_CATALOG_RELOAD=PASS rows={count}"),
                Err(error) => eprintln!("SOCTHINK_CATALOG_RELOAD=REJECTED reason={error}"),
            }
        }
    });
    println!(
        "SOCTHINK_CATALOG_R2_READY rows={} (read-only, internal, SIGHUP refresh)",
        handle.len()
    );
    let listener = tokio::net::TcpListener::bind(bind).await?;
    axum::serve(listener, router_with_handle(handle)).await?;
    Ok(())
}

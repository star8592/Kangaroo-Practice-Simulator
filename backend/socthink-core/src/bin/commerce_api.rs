use socthink_rust_core::commerce::{CommerceState, commerce_router};
use std::{env, error::Error, net::SocketAddr};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    let bind: SocketAddr = env::var("SOCTHINK_COMMERCE_BIND")
        .unwrap_or_else(|_| "127.0.0.1:37872".to_string())
        .parse()?;
    if !bind.ip().is_loopback() {
        return Err("commerce API is internal-only; refusing non-loopback bind".into());
    }

    let state = CommerceState::from_env().await?;
    let listener = tokio::net::TcpListener::bind(bind).await?;
    println!("SOCTHINK_COMMERCE_API_READY (internal, voucher preview only)");
    axum::serve(listener, commerce_router(state)).await?;
    Ok(())
}

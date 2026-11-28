use socthink_rust_core::commerce::wuhan_private_archive_router;
#[tokio::main]
async fn main()->Result<(),Box<dyn std::error::Error+Send+Sync>>{
 let bind:std::net::SocketAddr=std::env::var("SOCTHINK_WUHAN_ARCHIVE_BIND").unwrap_or_else(|_|"127.0.0.1:37873".into()).parse()?;
 if !bind.ip().is_loopback(){return Err("private archive requires loopback".into());}
 let router=wuhan_private_archive_router().await?;
 let listener=tokio::net::TcpListener::bind(bind).await?;
 println!("WUHAN_PRIVATE_ARCHIVE_READY");
 axum::serve(listener,router).await?;
 Ok(())
}

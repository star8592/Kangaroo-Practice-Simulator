// Offline parity-only binary. It must never be used as a network service.
// Reads test input with correct answers from stdin and writes a grade JSON to
// stdout. No auth, session, payment, or attempt data authority.
use socthink_rust_core::grading::{Request, grade};
use std::io::{self, Read};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut source = String::new();
    io::stdin()
        .take(4 * 1024 * 1024)
        .read_to_string(&mut source)?;
    let request: Request = serde_json::from_str(&source)?;
    if request.questions.is_empty() || request.questions.len() > 100 {
        return Err("Invalid grade fixture question count".into());
    }
    if request.answers.len() > 1000 {
        return Err("Invalid grade fixture answer count".into());
    }
    println!("{}", serde_json::to_string(&grade(&request))?);
    Ok(())
}

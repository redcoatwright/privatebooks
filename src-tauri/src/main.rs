// src-tauri/src/main.rs
// This connects your Python backend to the React frontend

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::process::Command;
use std::env;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
struct TransactionFilter {
    start_date: Option<String>,
    end_date: Option<String>,
    category: Option<String>,
}

// Call Python backend
fn call_python_api(method: &str, args: Value) -> Result<Value, String> {
    // Get the path to the Python script
    let current_dir = env::current_dir().map_err(|e| e.to_string())?;
    let backend_path = current_dir.join("backend");
    
    // Build the Python command
    let python_code = format!(
        r#"
import sys
import json
sys.path.append('{}')
from main import BankAnalyzerAPI

api = BankAnalyzerAPI()
args = json.loads('{}')
result = api.{}(**args) if args else api.{}()
print(json.dumps(result))
"#,
        backend_path.display(),
        args.to_string().replace("'", "\\'"),
        method,
        method
    );
    
    // Execute Python
    let output = Command::new("python3")
        .arg("-c")
        .arg(&python_code)
        .output()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python error: {}", error));
    }
    
    // Parse the output
    let result_str = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&result_str)
        .map_err(|e| format!("Failed to parse Python response: {} - Output: {}", e, result_str))
}

#[tauri::command]
fn parse_csv(file_path: String) -> Result<Value, String> {
    call_python_api("parse_csv", json!({ "file_path": file_path }))
}

#[tauri::command]
fn get_transactions(
    filters: Option<TransactionFilter>,
    pagination: Option<Value>
) -> Result<Value, String> {
    let args = json!({
        "filters": filters,
        "pagination": pagination
    });
    call_python_api("get_transactions", args)
}

#[tauri::command]
fn get_spending_summary(start_date: String, end_date: String) -> Result<Value, String> {
    call_python_api(
        "get_spending_summary",
        json!({
            "start_date": start_date,
            "end_date": end_date
        })
    )
}

#[tauri::command]
fn get_category_breakdown(start_date: String, end_date: String) -> Result<Value, String> {
    call_python_api(
        "get_category_breakdown",
        json!({
            "start_date": start_date,
            "end_date": end_date
        })
    )
}

#[tauri::command]
fn get_trends(months: Option<i32>) -> Result<Value, String> {
    call_python_api(
        "get_trends",
        json!({ "months": months.unwrap_or(12) })
    )
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            parse_csv,
            get_transactions,
            get_spending_summary,
            get_category_breakdown,
            get_trends
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
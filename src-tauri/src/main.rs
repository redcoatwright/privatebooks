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
    
    // In dev mode, current_dir is src-tauri, so we need to go up one level
    let project_root = if current_dir.file_name()
        .and_then(|name| name.to_str())
        .map_or(false, |name| name == "src-tauri") {
        current_dir.parent().unwrap().to_path_buf()
    } else {
        current_dir.clone()
    };
    
    let backend_path = project_root.join("backend");
    
    // Use the virtual environment's Python
    let python_executable = if cfg!(windows) {
        backend_path.join("pbook").join("Scripts").join("python.exe")
    } else {
        backend_path.join("pbook").join("bin").join("python")
    };
    
    // Build the Python command
    let python_code = format!(
        r#"
import sys
import json
import os
os.chdir('{}')
sys.path.insert(0, '{}')
from main import BankAnalyzerAPI

api = BankAnalyzerAPI()
args = json.loads('{}')
result = api.{}(**args) if args else api.{}()
print(json.dumps(result))
"#,
        backend_path.display(),
        backend_path.display(),
        args.to_string().replace("'", "\\'").replace("\"", "\\\""),
        method,
        method
    );
    
    // Execute Python from venv
    let output = Command::new(&python_executable)
        .arg("-c")
        .arg(&python_code)
        .output()
        .or_else(|_| {
            // Fallback to system python if venv doesn't exist
            Command::new("python3")
                .arg("-c")
                .arg(&python_code)
                .output()
        })
        .or_else(|_| {
            // Fallback to python
            Command::new("python")
                .arg("-c")
                .arg(&python_code)
                .output()
        })
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
    // Only pass filters to Python, ignore pagination for now
    let args = if let Some(f) = filters {
        json!({ "filters": f })
    } else {
        json!({})
    };
    call_python_api("get_transactions", args)
}

#[tauri::command]
fn update_transaction(transaction_id: String, updates: Value) -> Result<Value, String> {
    call_python_api(
        "update_transaction",
        json!({
            "transaction_id": transaction_id,
            "updates": updates
        })
    )
}

#[tauri::command]
fn delete_transaction(transaction_id: String) -> Result<Value, String> {
    call_python_api(
        "delete_transaction",
        json!({
            "transaction_id": transaction_id
        })
    )
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
fn get_trends(months: Option<i32>) -> Result<Value, String> {
    call_python_api(
        "get_trends",
        json!({ "months": months.unwrap_or(12) })
    )
}

#[tauri::command]
fn get_categories() -> Result<Value, String> {
    call_python_api("get_categories", json!({}))
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
fn check_password_status() -> Result<Value, String> {
    call_python_api("check_password_status", json!({}))
}

#[tauri::command]
fn setup_password(password: String) -> Result<Value, String> {
    call_python_api(
        "setup_password",
        json!({ "password": password })
    )
}

#[tauri::command]
fn verify_password(password: String) -> Result<Value, String> {
    call_python_api(
        "verify_password",
        json!({ "password": password })
    )
}

#[tauri::command]
fn change_password(old_password: String, new_password: String) -> Result<Value, String> {
    call_python_api(
        "change_password_method",
        json!({
            "old_password": old_password,
            "new_password": new_password
        })
    )
}

#[tauri::command]
fn disable_password(password: String) -> Result<Value, String> {
    call_python_api(
        "disable_password",
        json!({ "password": password })
    )
}

#[tauri::command]
fn export_spending(
    start_date: String,
    end_date: String,
    format: String,
    file_path: String
) -> Result<Value, String> {
    call_python_api(
        "export_spending_by_category",
        json!({
            "start_date": start_date,
            "end_date": end_date,
            "format": format,
            "file_path": file_path
        })
    )
}

#[tauri::command]
fn get_monthly_spending_by_category(
    start_date: String,
    end_date: String
) -> Result<Value, String> {
    call_python_api(
        "get_monthly_spending_by_category",
        json!({
            "start_date": start_date,
            "end_date": end_date
        })
    )
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            parse_csv,
            get_transactions,
            get_spending_summary,
            get_category_breakdown,
            get_trends,
            update_transaction,
            delete_transaction,
            get_categories,
            check_password_status,
            setup_password,
            verify_password,
            change_password,
            disable_password,
            export_spending,
            get_monthly_spending_by_category
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
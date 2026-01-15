use tauri::Manager;
use std::fs;

/**
 * JSON File Reading Commands
 */
#[tauri::command]
fn read_employee_json(app: tauri::AppHandle) -> Result<String, String> {
    let res_path = app.path().resource_dir().map_err(|e| e.to_string())?;
    let json_path = res_path.join("assets/employees.json");
    fs::read_to_string(json_path).map_err(|e| e.to_string())
}
#[tauri::command]
fn read_code_json(app: tauri::AppHandle) -> Result<String, String> {
    let res_path = app.path().resource_dir().map_err(|e| e.to_string())?;
    let json_path = res_path.join("assets/codes.json");
    fs::read_to_string(json_path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_employee_json, read_code_json])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

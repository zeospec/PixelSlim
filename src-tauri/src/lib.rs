mod processor;

use std::fs;
use std::path::PathBuf;
use processor::{ProcessOptions, ProcessResult, ScannedFile};

fn get_settings_path() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = base.join("com.pixelslim.desktop");
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
    dir.join("settings.json")
}

#[tauri::command]
fn process_image(file_path: String, options: ProcessOptions) -> Result<ProcessResult, String> {
    processor::process_image_file(&file_path, &options)
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathMetadata {
    pub path: String,
    pub name: String,
    pub size: u64,
}

#[tauri::command]
fn inspect_paths(paths: Vec<String>) -> Vec<PathMetadata> {
    let mut list = Vec::new();
    let supported_exts = ["png", "jpg", "jpeg", "webp", "svg", "gif", "avif"];

    for p_str in paths {
        let path = std::path::Path::new(&p_str);
        if !path.exists() {
            continue;
        }
        if path.is_dir() {
            let scanned = processor::scan_dir_for_images(&p_str);
            for s in scanned {
                list.push(PathMetadata {
                    path: s.path,
                    name: s.name,
                    size: s.size,
                });
            }
        } else if path.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase()) {
                if supported_exts.contains(&ext.as_str()) {
                    let size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
                    let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
                    list.push(PathMetadata {
                        path: p_str,
                        name,
                        size,
                    });
                }
            }
        }
    }
    list
}

#[tauri::command]
fn scan_directory(dir_path: String) -> Vec<ScannedFile> {
    processor::scan_dir_for_images(&dir_path)
}

#[tauri::command]
async fn select_directory() -> Option<String> {
    let folder = rfd::AsyncFileDialog::new()
        .set_title("Select Output Folder")
        .pick_folder()
        .await;
    folder.map(|f| f.path().to_string_lossy().to_string())
}

#[tauri::command]
async fn open_files_dialog() -> Vec<String> {
    let files = rfd::AsyncFileDialog::new()
        .set_title("Select Images")
        .add_filter("Images", &["png", "jpg", "jpeg", "webp", "svg", "gif", "avif"])
        .pick_files()
        .await;
    match files {
        Some(list) => list.into_iter().map(|f| f.path().to_string_lossy().to_string()).collect(),
        None => Vec::new(),
    }
}

#[tauri::command]
fn load_settings() -> serde_json::Value {
    let path = get_settings_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(val) = serde_json::from_str(&content) {
                return val;
            }
        }
    }
    serde_json::json!({
        "targetFormat": "original",
        "compressionMode": "smart",
        "targetSize": 500,
        "targetUnit": "KB",
        "quality": 82,
        "lossless": false,
        "maxWidth": "",
        "svgMode": "posterize",
        "destType": "same",
        "suffix": "",
        "outputDir": "",
        "replaceOriginal": false,
        "autoProcessSingle": false,
        "theme": "system"
    })
}

#[tauri::command]
fn save_settings(settings: serde_json::Value) -> Result<bool, String> {
    let path = get_settings_path();
    let json_str = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, json_str).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn reveal_in_finder(file_path: String) {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("-R")
            .arg(&file_path)
            .spawn();
    }
}

#[tauri::command]
fn write_clipboard_image(file_path: String) -> bool {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "set the clipboard to (read (POSIX file \"{}\") as «class PNGf»)",
            file_path.replace('"', "\\\"")
        );
        match std::process::Command::new("osascript").arg("-e").arg(&script).status() {
            Ok(s) => s.success(),
            Err(_) => false,
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

#[tauri::command]
fn write_clipboard_text(text: String) -> bool {
    #[cfg(target_os = "macos")]
    {
        use std::io::Write;
        if let Ok(mut child) = std::process::Command::new("pbcopy")
            .stdin(std::process::Stdio::piped())
            .spawn()
        {
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(text.as_bytes());
            }
            return child.wait().map(|s| s.success()).unwrap_or(false);
        }
    }
    false
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardImageInfo {
    pub file_path: String,
    pub file_name: String,
    pub size: u64,
}

#[tauri::command]
fn read_clipboard_image() -> Option<ClipboardImageInfo> {
    #[cfg(target_os = "macos")]
    {
        let cache_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("com.pixelslim.desktop")
            .join("clipboard_cache");
        let _ = fs::create_dir_all(&cache_dir);
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        let file_name = format!("screenshot-{}.png", timestamp);
        let file_path = cache_dir.join(&file_name);
        let file_path_str = file_path.to_string_lossy().to_string();

        let script = format!(
            r#"try
    set pngData to (the clipboard as «class PNGf»)
    set fRef to open for access (POSIX file "{}") with write permission
    set eof fRef to 0
    write pngData to fRef
    close access fRef
    return "ok"
on error
    return "fail"
end try"#,
            file_path_str.replace('"', "\\\"")
        );

        if let Ok(output) = std::process::Command::new("osascript").arg("-e").arg(&script).output() {
            let res = String::from_utf8_lossy(&output.stdout);
            if res.trim() == "ok" && file_path.exists() {
                if let Ok(meta) = fs::metadata(&file_path) {
                    if meta.len() > 0 {
                        return Some(ClipboardImageInfo {
                            file_path: file_path_str,
                            file_name,
                            size: meta.len(),
                        });
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            process_image,
            inspect_paths,
            scan_directory,
            select_directory,
            open_files_dialog,
            load_settings,
            save_settings,
            reveal_in_finder,
            read_clipboard_image,
            write_clipboard_image,
            write_clipboard_text,
            open_url,
            get_app_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running PixelSlim application");
}


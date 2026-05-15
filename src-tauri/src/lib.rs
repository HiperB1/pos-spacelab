use std::fs;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn download_guide(url: String, filename: String) -> Result<String, String> {
    // Obtener la carpeta Documentos del usuario
    let docs = dirs::document_dir().ok_or_else(|| {
        "No se pudo encontrar la carpeta Documentos del usuario.".to_string()
    })?;

    let guides_dir = docs.join("MySpace").join("Guías");

    // Crear la carpeta si no existe
    fs::create_dir_all(&guides_dir)
        .map_err(|e| format!("Error al crear la carpeta de guías: {}", e))?;

    let file_path = guides_dir.join(&filename);

    eprintln!("[RUST] Descargando guía: {} -> {:?}", url, file_path);

    // Descargar el PDF
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Error al descargar la guía desde Venndelo: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Venndelo respondió con error HTTP {} al descargar la guía.",
            response.status()
        ));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Error al leer el PDF descargado: {}", e))?;

    // Guardar el archivo
    fs::write(&file_path, &bytes)
        .map_err(|e| format!("Error al guardar el PDF en {}: {}", file_path.display(), e))?;

    eprintln!("[RUST] Guía guardada correctamente: {:?}", file_path);

    Ok(file_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    eprintln!("[RUST] Starting Tauri application...");
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![greet, download_guide])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

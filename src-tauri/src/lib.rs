mod parser;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            tauri::async_runtime::spawn(async {
                let _ = parser::fetch_and_save_kanji_list().await;
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            parser::get_kanji_list,
            parser::get_kanji,
            parser::fetch_and_save_kanji_list,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use tauri::{generate_context, Manager};

mod parser;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize database with fetched data
            tauri::async_runtime::block_on(async {
                // First fetch/load the kanji list
                let kanji_list = parser::fetch_and_save_kanji_list()
                    .await
                    .expect("Failed to get kanji list");
                
                // Create database with the fetched data
                let db = parser::models::KanjiDatabase {
                    kanjis: kanji_list
                };
                
                let db_state = parser::models::KanjiDatabaseState::new(db);
                app.manage(db_state);
            });
            
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            parser::get_kanji_list,
            parser::get_kanji,
            parser::fetch_and_save_kanji_list,
            parser::search_kanji,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

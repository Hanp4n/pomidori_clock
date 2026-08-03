#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri_plugin_sql::{Builder, Migration, MigrationKind};
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../../src/db/migrations/sqlite/pomidori_clock_local_v1.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_auth_tokens_to_user",
            sql: include_str!("../../src/db/migrations/sqlite/pomidori_clock_local_v2.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_app_state_table",
            sql: include_str!("../../src/db/migrations/sqlite/pomidori_clock_local_v3.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_id_task_category_pomodoro_config_tables",
            sql: include_str!("../../src/db/migrations/sqlite/pomidori_clock_local_v4.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "remove_auth_tokens_from_user",
            sql: include_str!("../../src/db/migrations/sqlite/pomidori_clock_local_v5.sql"),
            kind: MigrationKind::Up,
        },
    ];
    //println!("Running Tauri application with SQL migrations...");
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:pomidori_clock_local.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_connectivity::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?
            }
            //println!("Done");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    
}

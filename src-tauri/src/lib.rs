#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri_plugin_sql::{Builder, Migration, MigrationKind};
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
            description: "remove_auth_tokens_from_user",
            sql: include_str!("../../src/db/migrations/sqlite/pomidori_clock_local_v4.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "unique_taskcategory_per_task_and_category",
            sql: include_str!("../../src/db/migrations/sqlite/pomidori_clock_local_v5.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_pomodoro_flow_config_columns",
            sql: include_str!("../../src/db/migrations/sqlite/pomidori_clock_local_v6.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add_sound_enabled_to_pomodoro_config",
            sql: include_str!("../../src/db/migrations/sqlite/pomidori_clock_local_v7.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add_timer_state_table",
            sql: include_str!("../../src/db/migrations/sqlite/pomidori_clock_local_v8.sql"),
            kind: MigrationKind::Up,
        },
    ];
    //println!("Running Tauri application with SQL migrations...");
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:pomidori_clock_local.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_connectivity::init())
        .plugin(tauri_plugin_shell::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_keyring::init());
    }

    builder
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

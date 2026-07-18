import Database from "@tauri-apps/plugin-sql";

export async function getDb() {
    let dbInstance: Database | null = null;
    if (!dbInstance) {
        dbInstance = await Database.load("sqlite:pomidori_clock_local.db");
    }
    return dbInstance;
}
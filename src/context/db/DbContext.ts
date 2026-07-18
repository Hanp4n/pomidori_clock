import type Database from "@tauri-apps/plugin-sql"
import { createContext } from "react"

export type DbContextType = {
    instance: Database | null
}

export const DbContext = createContext<DbContextType | undefined>(undefined)
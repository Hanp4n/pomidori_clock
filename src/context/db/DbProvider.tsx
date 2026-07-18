import { getDb } from '@/db/db'
import type Database from '@tauri-apps/plugin-sql'
import React, { useState, useEffect } from 'react'
import { DbContext } from './DbContext'


export function DbProvider({ children }: { children: React.ReactNode }) {
    const [instance, setInstance] = useState<Database | null>(null)

    useEffect(() => {
      const initializeDatabase = async() => {
        const db = await getDb();
        setInstance(db);
      }
      initializeDatabase();
    }, []);

    return (
        <DbContext.Provider value={{ instance }}>
            {children}
        </DbContext.Provider>
    )
}

export default DbProvider
import { getDb } from '@/db/db'
import type Database from '@tauri-apps/plugin-sql'
import React, { useState, useEffect } from 'react'
import { DbContext } from './DbContext'


export function DbProvider({ children }: { children: React.ReactNode }) {
    const [instance, setInstance] = useState<Database | null>(null)

    useEffect(() => {
      getDb()
        .then(setInstance)
        .catch((err) =>
          console.error('Local database failed to initialize — every DB-backed action will be silently skipped:', err)
        );
    }, []);

    return (
        <DbContext.Provider value={{ instance }}>
            {children}
        </DbContext.Provider>
    )
}

export default DbProvider
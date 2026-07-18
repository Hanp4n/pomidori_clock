import { useContext } from "react"
import { DbContext } from "./DbContext"

export function useDb() {
    const context = useContext(DbContext)
    if (!context) {
        throw new Error('useDb must be used within DbProvider')
    }
    return context.instance
}
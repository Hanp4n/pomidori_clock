import React from 'react'
import AuthProvider from './auth/AuthProvider'
import { ConnectivityProvider } from './connectivity/ConnectivityProvider'
import { SyncProvider } from './sync/SyncProvider'
import DbProvider from './db/DbProvider'

const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <DbProvider>
      <AuthProvider>
        <ConnectivityProvider>
          <SyncProvider>
            {children}
          </SyncProvider>
        </ConnectivityProvider>
      </AuthProvider>
    </DbProvider>
  )
}

export default AppProviders
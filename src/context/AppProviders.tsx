import React from 'react'
import AuthProvider from './auth/AuthProvider'
import { ConnectivityProvider } from './connectivity/ConnectivityProvider'
import { SyncProvider } from './sync/SyncProvider'
import TaskProvider from './task/TaskProvider'
import PomodoroConfigProvider from './pomodoro-config/PomodoroConfigProvider'
import DbProvider from './db/DbProvider'

const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <DbProvider>
      <AuthProvider>
        <ConnectivityProvider>
          <SyncProvider>
            <TaskProvider>
              <PomodoroConfigProvider>
                {children}
              </PomodoroConfigProvider>
            </TaskProvider>
          </SyncProvider>
        </ConnectivityProvider>
      </AuthProvider>
    </DbProvider>
  )
}

export default AppProviders
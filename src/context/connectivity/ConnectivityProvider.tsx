import { useCallback, useEffect, useState } from 'react';
import { ConnectivityContext } from './ConnectivityContext';
import { connectionStatus } from '@silvermine/tauri-plugin-connectivity';

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  const probe = useCallback(async () => {
    const status = await connectionStatus();
    setIsOnline(status.connected);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    probe();

    const intervalId = window.setInterval(probe, 5000);

    window.addEventListener('online', probe);
    window.addEventListener('offline', probe);
    const show = () => { if (document.visibilityState === 'visible') probe(); };
    document.addEventListener('visibilitychange', show);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', probe);
      window.removeEventListener('offline', probe);
      document.removeEventListener('visibilitychange', show);
    };
  }, [probe]);

  return <ConnectivityContext.Provider value={isOnline}>{children}</ConnectivityContext.Provider>;
}

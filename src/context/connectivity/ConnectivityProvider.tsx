import { useEffect, useState } from 'react';
import { ConnectivityContext } from './ConnectivityContext';


export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return <ConnectivityContext.Provider value={isOnline}>{children}</ConnectivityContext.Provider>;
}

import type { LocalUser } from '@/db/schema.sqlite';
import { getPassword, deletePassword, getSecret, setSecret, deleteSecret } from 'tauri-plugin-keyring-api';

export type KeychainSession = {
  access_token: string;
  refresh_token: string;
};

const SERVICE = 'pomidori-clock';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const getSessionKey = (user: Pick<LocalUser, 'id'>) => user.id;

export const getSession = async (sessionKey: string): Promise<KeychainSession | null> => {
  try {
    const stored = await getSecret(SERVICE, sessionKey);
    if (stored && stored.length > 0) {
      const parsed = JSON.parse(decoder.decode(stored));
      if (parsed && typeof parsed.refresh_token === 'string' && parsed.refresh_token) {
        return {
          access_token: typeof parsed.access_token === 'string' ? parsed.access_token : '',
          refresh_token: parsed.refresh_token,
        };
      }
    }
  } catch (err) {
    console.error('Failed to read session from keychain:', err);
  }

  try {
    const legacy = await getPassword(SERVICE, sessionKey);
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (parsed && typeof parsed.refresh_token === 'string' && parsed.refresh_token) {
          return {
            access_token: typeof parsed.access_token === 'string' ? parsed.access_token : '',
            refresh_token: parsed.refresh_token,
          };
        }
      } catch {
        // Plain refresh-token-only format from the previous implementation.
        return { access_token: '', refresh_token: legacy };
      }
    }
  } catch (err) {
    console.error('Failed to read legacy session from keychain:', err);
  }

  return null;
};

export const saveSession = async (sessionKey: string, session: KeychainSession): Promise<void> => {
  await setSecret(SERVICE, sessionKey, encoder.encode(JSON.stringify(session)));
};

export const clearSession = async (sessionKey: string): Promise<void> => {
  await Promise.allSettled([
    deleteSecret(SERVICE, sessionKey),
    deletePassword(SERVICE, sessionKey),
  ]);
};

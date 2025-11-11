import { useCallback, useEffect, useState } from 'react';
import type { UserInfo } from '../contexts/SettingsContext';

export function usePuterAuth() {
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const api = window.puter?.auth;
      if (!api) {
        setSignedIn(false);
        setUser(null);
        setLoading(false);
        return;
      }
      const is = await api.isSignedIn();
      setSignedIn(Boolean(is));
      setUser(is ? (await api.getUser()) || null : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setSignedIn(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async () => {
    setLoading(true);
    try {
      await window.puter?.auth?.signIn();
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await window.puter?.auth?.signOut();
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    const t = setTimeout(refresh, 1500);
    return () => clearTimeout(t);
  }, [refresh]);

  return { signedIn, user, loading, error, refresh, signIn, signOut };
}

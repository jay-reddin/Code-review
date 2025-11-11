import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';
export type DeviceSize = 'iphone' | 'ipad' | 'desktop' | 'full';
export type Provider = 'pollinations' | 'puter';

export interface UserInfo {
  id?: string;
  email?: string;
  name?: string;
}

interface SettingsState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  deviceSize: DeviceSize;
  setDeviceSize: (d: DeviceSize) => void;
  preferredProvider: Provider;
  setPreferredProvider: (p: Provider) => void;
  puterSignedIn: boolean;
  puterUser: UserInfo | null;
  refreshPuterAuth: () => Promise<void>;
  signInPuter: () => Promise<void>;
  signOutPuter: () => Promise<void>;
}

const SettingsContext = createContext<SettingsState | null>(null);

const THEME_KEY = 'app.theme';
const DEVICE_KEY = 'app.deviceSize';
const PROVIDER_KEY = 'app.provider';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) || 'light');
  const [deviceSize, setDeviceSize] = useState<DeviceSize>(() => (localStorage.getItem(DEVICE_KEY) as DeviceSize) || 'desktop');
  const [preferredProvider, setPreferredProvider] = useState<Provider>(() => (localStorage.getItem(PROVIDER_KEY) as Provider) || 'pollinations');
  const [puterSignedIn, setPuterSignedIn] = useState(false);
  const [puterUser, setPuterUser] = useState<UserInfo | null>(null);

  // Persist settings
  useEffect(() => localStorage.setItem(THEME_KEY, theme), [theme]);
  useEffect(() => localStorage.setItem(DEVICE_KEY, deviceSize), [deviceSize]);
  useEffect(() => localStorage.setItem(PROVIDER_KEY, preferredProvider), [preferredProvider]);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  const refreshPuterAuth = useCallback(async () => {
    try {
      const api = window.puter?.auth;
      if (!api) {
        setPuterSignedIn(false);
        setPuterUser(null);
        return;
      }
      const signed = await api.isSignedIn();
      setPuterSignedIn(Boolean(signed));
      if (signed) {
        const user = await api.getUser();
        setPuterUser(user || null);
      } else {
        setPuterUser(null);
      }
    } catch {
      setPuterSignedIn(false);
      setPuterUser(null);
    }
  }, []);

  const signInPuter = useCallback(async () => {
    const api = window.puter?.auth;
    if (!api) return;
    await api.signIn();
    await refreshPuterAuth();
  }, [refreshPuterAuth]);

  const signOutPuter = useCallback(async () => {
    const api = window.puter?.auth;
    if (!api) return;
    await api.signOut();
    await refreshPuterAuth();
  }, [refreshPuterAuth]);

  useEffect(() => {
    // Refresh once script has likely loaded
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await refreshPuterAuth();
    })();
    // Also refresh after a small delay to catch deferred script load
    const t = setTimeout(() => refreshPuterAuth(), 1500);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [refreshPuterAuth]);

  const value = useMemo<SettingsState>(() => ({
    theme,
    setTheme,
    deviceSize,
    setDeviceSize,
    preferredProvider,
    setPreferredProvider,
    puterSignedIn,
    puterUser,
    refreshPuterAuth,
    signInPuter,
    signOutPuter,
  }), [theme, deviceSize, preferredProvider, puterSignedIn, puterUser, refreshPuterAuth, signInPuter, signOutPuter]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

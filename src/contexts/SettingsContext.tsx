import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';
export type DeviceSize = 'iphone' | 'ipad' | 'desktop' | 'full';
export type Provider = 'pollinations' | 'puter';

export interface UserInfo {
  id?: string;
  email?: string;
  name?: string;
}

interface PutterUsage {
  used: number;
  limit: number | null; // null if unknown
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
  puterUsage: PutterUsage | null;
  refreshPuterAuth: () => Promise<void>;
  refreshPuterUsage: () => Promise<void>;
  signInPuter: () => Promise<boolean>;
  signOutPuter: () => Promise<void>;
  pollinationsModels: string[];
  puterModels: string[];
  refreshPollinationsModels: () => Promise<string[]>;
  refreshPuterModels: () => Promise<string[]>;
  activeModels: Record<string, boolean>;
  setActiveModels: (m: Record<string, boolean>) => void;
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
  const [puterUsage, setPuterUsage] = useState<PutterUsage | null>(null);
  const [pollinationsModels, setPollinationsModels] = useState<string[]>([]);
  const [puterModels, setPuterModels] = useState<string[]>([]);
  const [activeModels, setActiveModels] = useState<Record<string, boolean>>(() => JSON.parse(localStorage.getItem('active.models') || '{}'));

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

  const refreshPuterUsage = useCallback(async () => {
    try {
      const api = window.puter?.auth;
      if (!api) {
        setPuterUsage(null);
        return;
      }
      // try getMonthlyUsage then fallback to detailed
      let usage: PutterUsage | null = null;
      try {
        const mu = await api.getMonthlyUsage?.();
        if (mu) {
          // flexible parsing
          const used = typeof mu.used === 'number' ? mu.used : (typeof mu.consumed === 'number' ? mu.consumed : null);
          const limit = typeof mu.limit === 'number' ? mu.limit : (typeof mu.quota === 'number' ? mu.quota : null);
          if (used !== null) usage = { used, limit };
        }
      } catch (e) {
        // ignore
        usage = null;
      }

      // if still null, attempt detailed app usage
      if (!usage && api.getDetailedAppUsage) {
        try {
          const d = await api.getDetailedAppUsage();
          // try to compute sum
          if (d && Array.isArray(d.items)) {
            const totalUsed = d.items.reduce((s: number, it: any) => s + (Number(it.usage || it.used || 0) || 0), 0);
            // if there is quota info
            const limit = typeof d.limit === 'number' ? d.limit : null;
            usage = { used: totalUsed, limit };
          }
        } catch (e) {
          // ignore
        }
      }

      setPuterUsage(usage);
    } catch {
      setPuterUsage(null);
    }
  }, []);

  const refreshPollinationsModels = useCallback(async () => {
    try {
      const res = await fetch('https://text.pollinations.ai/models');
      if (!res.ok) throw new Error('Failed to fetch pollinations models');
      const data = await res.json().catch(() => null);
      // expect array of model names or objects
      let list: string[] = [];
      if (Array.isArray(data)) list = data.map((m: any) => (typeof m === 'string' ? m : m.name || m.id || JSON.stringify(m)));
      setPollinationsModels(list);
      return list;
    } catch (e) {
      setPollinationsModels([]);
      return [];
    }
  }, []);

  const refreshPuterModels = useCallback(async () => {
    try {
      const res = await fetch('https://api.puter.com/puterai/chat/models/');
      if (!res.ok) throw new Error('Failed to fetch puter models');
      const data = await res.json().catch(() => null);
      let list: string[] = [];
      if (Array.isArray(data)) list = data.map((m: any) => (typeof m === 'string' ? m : m.name || m.id || JSON.stringify(m)));
      setPuterModels(list);
      return list;
    } catch (e) {
      setPuterModels([]);
      return [];
    }
  }, []);

  const refreshPuterAuth = useCallback(async () => {
    try {
      const api = window.puter?.auth;
      if (!api) {
        setPuterSignedIn(false);
        setPuterUser(null);
        setPuterUsage(null);
        return;
      }
      const signed = await api.isSignedIn();
      setPuterSignedIn(Boolean(signed));
      if (signed) {
        const userRaw = await api.getUser();
        let normalized = null as UserInfo | null;
        if (userRaw) {
          const id = userRaw.id ?? userRaw.userId ?? userRaw.user_id ?? userRaw.uid ?? userRaw.sub ?? null;
          const email = userRaw.email ?? userRaw.mail ?? userRaw.username?.includes('@') ? userRaw.username : null ?? null;
          const name = userRaw.name ?? userRaw.fullName ?? userRaw.username ?? (email ? String(email).split('@')[0] : null) ?? null;
          normalized = { id: id || undefined, email: email || undefined, name: name || undefined };
        }
        setPuterUser(normalized);
        await refreshPuterUsage();
      } else {
        setPuterUser(null);
        setPuterUsage(null);
      }
    } catch {
      setPuterSignedIn(false);
      setPuterUser(null);
      setPuterUsage(null);
    }
  }, [refreshPuterUsage]);

  const signInPuter = useCallback(async () => {
    const api = window.puter?.auth;
    if (!api) return false;
    try {
      await api.signIn();
      await refreshPuterAuth();
      return true;
    } catch (e) {
      console.error('Puter signIn failed', e);
      return false;
    }
  }, [refreshPuterAuth]);

  const signOutPuter = useCallback(async () => {
    const api = window.puter?.auth;
    if (!api) return;
    try {
      await api.signOut();
    } catch (e) {
      console.error('Puter signOut failed', e);
    }
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
    puterUsage,
    refreshPuterAuth,
    refreshPuterUsage,
    signInPuter,
    signOutPuter,
    pollinationsModels,
    puterModels,
    refreshPollinationsModels,
    refreshPuterModels,
    activeModels,
    setActiveModels,
  }), [theme, deviceSize, preferredProvider, puterSignedIn, puterUser, puterUsage, refreshPuterAuth, refreshPuterUsage, signInPuter, signOutPuter, pollinationsModels, puterModels, refreshPollinationsModels, refreshPuterModels, activeModels]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

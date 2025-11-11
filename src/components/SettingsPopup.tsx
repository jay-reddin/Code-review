import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export function SettingsPopup({ onClose }: { onClose: () => void }) {
  const {
    theme,
    setTheme,
    deviceSize,
    setDeviceSize,
    preferredProvider,
    setPreferredProvider,
    puterSignedIn,
    puterUser,
    signInPuter,
    signOutPuter,
  } = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-x-4 top-10 mx-auto max-w-2xl rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold">Settings</h2>
          <button aria-label="Close" onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-4">
          <section>
            <h3 className="font-medium mb-2">Account</h3>
            {puterSignedIn ? (
              <div className="space-y-2">
                <div className="text-sm">Signed in with Puter</div>
                {puterUser && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <div>Name: {puterUser.name || '—'}</div>
                    <div>Email: {puterUser.email || '—'}</div>
                  </div>
                )}
                <button
                  onClick={signOutPuter}
                  className="mt-2 inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">Sign in with Puter to unlock additional AI models.</p>
                <button
                  onClick={signInPuter}
                  className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Sign In with Puter
                </button>
              </div>
            )}
          </section>

          <section>
            <h3 className="font-medium mb-2">Preferences</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <label htmlFor="theme">Theme</label>
                <select
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="device">Default device size</label>
                <select
                  id="device"
                  value={deviceSize}
                  onChange={(e) => setDeviceSize(e.target.value as any)}
                  className="rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1"
                >
                  <option value="iphone">iPhone</option>
                  <option value="ipad">iPad</option>
                  <option value="desktop">Desktop</option>
                  <option value="full">Full</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-medium mb-2">AI Models</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Provider</span>
                <select
                  value={preferredProvider}
                  onChange={(e) => setPreferredProvider(e.target.value as any)}
                  className="rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1"
                >
                  <option value="pollinations">Pollinations (default)</option>
                  <option value="puter" disabled={!puterSignedIn}>Puter {puterSignedIn ? '' : '(Sign-in required)'}</option>
                </select>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">When both are available, app may fall back automatically if a provider fails.</p>
            </div>
          </section>

          <section>
            <h3 className="font-medium mb-2">About</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">Vibe Coder - dual AI provider architecture with optional Puter enhancements.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

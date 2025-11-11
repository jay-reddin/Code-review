import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
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
    puterUsage,
    refreshPuterUsage,
    signInPuter,
    signOutPuter,
    pollinationsModels,
    puterModels,
    refreshPollinationsModels,
    refreshPuterModels,
    activeModels,
    setActiveModels,
  } = useSettings();

  const [showModels, setShowModels] = useState<'pollinations' | 'puter' | null>(null);
  const [modelSearch, setModelSearch] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const content = (
    <div className="fixed inset-0 z-[2000000]">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />

      <div className="fixed inset-0 flex items-start justify-center pt-20 px-4">
        <div className="max-w-2xl w-full panel settings-modal z-[2000001]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold">Settings</h2>
            <button aria-label="Close" onClick={onClose} className="btn settings-close-btn">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6 p-4 settings-grid modal-inner">
            <section>
              <h3 className="font-medium mb-2">Account</h3>
              {puterSignedIn ? (
                <div className="space-y-2">
                  <div className="text-sm">Signed in with Puter</div>
                  {puterUser && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div>Name: {puterUser.name || '—'}</div>
                      <div>Email: {puterUser.email || '—'}</div>
                    </div>
                  )}

                  {puterUsage ? (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-1">Monthly usage</div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-3 overflow-hidden">
                        <div
                          className="h-3 bg-green-500"
                          style={{ width: `${Math.min(100, Math.round((puterUsage.used / (puterUsage.limit || Math.max(puterUsage.used,1))) * 100))}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{puterUsage.used} used{puterUsage.limit ? ` • ${puterUsage.limit} limit` : ''}</div>
                      <div className="mt-2">
                        <button onClick={refreshPuterUsage} className="text-xs rounded border px-2 py-1">Refresh usage</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-2">Usage data not available</div>
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
                    Sign In Puter
                  </button>
                </div>
              )}
            </section>

            <section>
              <h3 className="font-medium mb-2">Preferences</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <label htmlFor="theme">Theme</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
                    >
                      Toggle Theme
                    </button>
                  </div>
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
                <div className="flex items-center gap-2">
                  <span className="mr-auto">Provider</span>
                  <select
                    value={preferredProvider}
                    onChange={(e) => setPreferredProvider(e.target.value as any)}
                    className="rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1"
                  >
                    <option value="pollinations">Pollinations (default)</option>
                    <option value="puter" disabled={!puterSignedIn}>Puter {puterSignedIn ? '' : '(Sign-in required)'}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={async () => { await refreshPollinationsModels(); }} className="px-3 py-1 rounded border text-sm">Refresh Pollinations Models</button>
                  <button onClick={async () => { await refreshPuterModels(); }} className="px-3 py-1 rounded border text-sm" disabled={!puterSignedIn}>Refresh Puter Models</button>
                  {pollinationsModels.length > 0 && <button onClick={() => setShowModels('pollinations')} className="px-3 py-1 rounded border text-sm">Pollinations Models</button>}
                  {puterModels.length > 0 && <button onClick={() => setShowModels('puter')} className="px-3 py-1 rounded border text-sm">Puter Models</button>}
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

      {showModels && (
        <div className="fixed inset-0 z-[2000002]">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModels(null)} />
          <div className="fixed left-6 right-6 top-20 mx-auto max-w-3xl panel model-modal z-[2000003]">
            <div className="flex items-center justify-between mb-3 px-4 py-3 border-b">
              <h3 className="text-base font-semibold">{showModels === 'pollinations' ? 'Pollinations Models' : 'Puter Models'}</h3>
              <div className="flex items-center gap-2">
                <input value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} placeholder="Search models" className="px-2 py-1 rounded border text-sm" />
                <button onClick={() => {
                  const list = (showModels === 'pollinations' ? pollinationsModels : puterModels).filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()));
                  const next = { ...activeModels };
                  list.forEach((m) => { next[m] = true; });
                  setActiveModels(next);
                  localStorage.setItem('active.models', JSON.stringify(next));
                }} className="px-2 py-1 rounded border text-sm">Select All</button>
                <button onClick={() => {
                  const list = (showModels === 'pollinations' ? pollinationsModels : puterModels).filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()));
                  const next = { ...activeModels };
                  list.forEach((m) => { next[m] = false; });
                  setActiveModels(next);
                  localStorage.setItem('active.models', JSON.stringify(next));
                }} className="px-2 py-1 rounded border text-sm">Deselect All</button>
                <button onClick={() => setShowModels(null)} className="px-2 py-1 rounded border">Close</button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-auto p-2 space-y-2">
              {(showModels === 'pollinations' ? pollinationsModels : puterModels).filter(m => m.toLowerCase().includes(modelSearch.toLowerCase())).map((m) => (
                <div key={m} className="flex items-center justify-between border-b py-2">
                  <div className="text-sm">{m}</div>
                  <input type="checkbox" checked={!!activeModels[m]} onChange={(e) => { const next = { ...activeModels, [m]: e.target.checked }; setActiveModels(next); localStorage.setItem('active.models', JSON.stringify(next)); }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

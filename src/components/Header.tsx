import { Settings } from 'lucide-react';
import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { SettingsPopup } from './SettingsPopup';

export function Header() {
  const { theme } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full border-b bg-white/70 dark:bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-gray-900/50">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Vibe Coder</h1>
        <button
          aria-label="Open Settings"
          onClick={() => setOpen(true)}
          className="btn"
        >
          <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'><path d='M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z' opacity='.9'/><path d='M19.4 12.9c.04-.3.06-.61.06-.93s-.02-.63-.06-.93l2.11-1.65a.5.5 0 00.12-.64l-2-3.46a.5.5 0 00-.6-.22l-2.49 1a7.02 7.02 0 00-1.6-.93l-.38-2.65A.5.5 0 0013.6 2h-3.2a.5.5 0 00-.5.42l-.38 2.65c-.56.2-1.09.49-1.6.93l-2.49-1a.5.5 0 00-.6.22l-2 3.46a.5.5 0 00.12.64L4.6 11.03C4.56 11.33 4.54 11.64 4.54 11.96s.02.63.06.93L2.49 14.54a.5.5 0 00-.12.64l2 3.46c.14.24.43.34.68.24l2.49-1c.5.44 1.04.79 1.6.99l.38 2.65c.05.28.3.48.58.48h3.2c.28 0 .53-.2.58-.48l.38-2.65c.56-.2 1.09-.55 1.6-.99l2.49 1c.25.1.54 0 .68-.24l2-3.46a.5.5 0 00-.12-.64l-2.11-1.65z' opacity='.6'/></svg>" alt="settings" className="h-5 w-5" />
        </button>
      </div>
      {open && <SettingsPopup onClose={() => setOpen(false)} />}
    </header>
  );
}

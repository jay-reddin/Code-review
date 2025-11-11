import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dualChat } from '../services/ai';
import { useSettings } from '../contexts/SettingsContext';
import { Download, ExternalLink, Moon, Sun, X, Code as CodeIcon, Play } from 'lucide-react';

const DEFAULT_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app">Hello from preview</div>
  </body>
</html>`;

const DEFAULT_CSS = `body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 24px; background: #fff; color: #111 }
#app { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px }
`;

const DEFAULT_JS = `const el = document.getElementById('app');
el.innerHTML += ' — script loaded';
`;

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4"></circle>
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
    </svg>
  );
}

export function CodeEditor(): JSX.Element {
  const { preferredProvider, theme, setTheme } = useSettings();

  const [html, setHtml] = useState<string>(DEFAULT_HTML);
  const [css, setCss] = useState<string>(DEFAULT_CSS);
  const [js, setJs] = useState<string>(DEFAULT_JS);
  const [tab, setTab] = useState<'html' | 'css' | 'js' | 'output'>('html');
  const [deviceSize, setDeviceSizeState] = useState<'full' | 'iphone' | 'ipad' | 'desktop'>('full');

  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('openai');
  const [editorVisible, setEditorVisible] = useState<boolean>(true);
  const [overlayVisible, setOverlayVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const combinedSrcDoc = useMemo(() => {
    const hasHtml = /<html[\s>]/i.test(html);
    if (hasHtml) {
      let doc = html;
      if (!/<style[\s\S]*?>/.test(doc)) doc = doc.replace(/<\/head>/i, `<style>${css}</style>\n</head>`);
      if (!/<script[\s\S]*?>/.test(doc)) doc = doc.replace(/<\/body>/i, `<script>${js}<\/script>\n</body>`);
      return doc;
    }
    return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${css}</style></head><body>${html}<script>${js}</script></body></html>`;
  }, [html, css, js]);

  useEffect(() => {
    const t = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      try {
        iframe.srcdoc = combinedSrcDoc;
      } catch (e) {
        const doc = iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(combinedSrcDoc);
          doc.close();
        }
      }
    }, 250);
    return () => clearTimeout(t);
  }, [combinedSrcDoc]);

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatHistory]);

  useEffect(() => {
    document.body.classList.remove('dark-mode', 'light-mode');
    document.body.classList.add(theme === 'dark' ? 'dark-mode' : 'light-mode');
  }, [theme]);

  const adjustLayout = useCallback(() => {
    const header = document.querySelector('header') as HTMLElement | null;
    const footer = document.querySelector('footer') as HTMLElement | null;
    const chatInput = document.querySelector('.chat-input') as HTMLElement | null;
    const chat = document.querySelector('.chat') as HTMLElement | null;
    const content = document.querySelector('.content') as HTMLElement | null;
    const leftPanel = document.querySelector('.left-panel') as HTMLElement | null;
    const rightPanel = document.querySelector('.right-panel') as HTMLElement | null;
    const chatHeader = document.querySelector('.chat-header') as HTMLElement | null;
    const toolbar = document.querySelector('.toolbar') as HTMLElement | null;
    const tabs = document.querySelector('.tabs') as HTMLElement | null;

    const headerHeight = header?.offsetHeight ?? 0;
    const footerHeight = footer?.offsetHeight ?? 0;
    const chatHeaderHeight = chatHeader?.offsetHeight ?? 0;
    const toolbarHeight = toolbar?.offsetHeight ?? 0;
    const tabsHeight = tabs?.offsetHeight ?? 0;
    const chatInputHeight = chatInput?.offsetHeight ?? 0;

    if (window.innerWidth <= 768) {
      if (chatInput) chatInput.style.bottom = `${footerHeight}px`;
      if (chat) chat.style.paddingBottom = `${footerHeight + chatInputHeight}px`;
      if (chat) chat.style.maxHeight = `calc(100dvh - ${headerHeight + footerHeight + chatHeaderHeight + chatInputHeight}px)`;
      if (rightPanel) {
        rightPanel.style.top = `${headerHeight}px`;
        rightPanel.style.height = `calc(100dvh - ${headerHeight + footerHeight + chatInputHeight}px)`;
      }
      if (content) content.style.maxHeight = `calc(100dvh - ${headerHeight + toolbarHeight + tabsHeight + footerHeight + chatInputHeight}px)`;
    } else {
      if (leftPanel) leftPanel.style.height = `calc(100vh - ${headerHeight + footerHeight}px)`;
      if (rightPanel) rightPanel.style.height = `calc(100vh - ${headerHeight + footerHeight}px)`;
      if (chat) chat.style.maxHeight = `calc(100vh - ${headerHeight + footerHeight + chatHeaderHeight + chatInputHeight}px)`;
      if (content) content.style.maxHeight = `calc(100vh - ${headerHeight + footerHeight + toolbarHeight + tabsHeight}px)`;
      if (chatInput) chatInput.style.bottom = '0';
      if (chat) chat.style.paddingBottom = '10px';
      if (rightPanel) rightPanel.style.top = '0';
    }
  }, []);

  useEffect(() => {
    adjustLayout();
    window.addEventListener('resize', adjustLayout);
    return () => window.removeEventListener('resize', adjustLayout);
  }, [adjustLayout]);

  function switchTab(to: 'html' | 'css' | 'js' | 'output') {
    setTab(to);
    if (to === 'output') setDeviceSizeState((s) => s);
  }

  function startNewChat() {
    setChatHistory([]);
    setHtml(DEFAULT_HTML);
    setCss(DEFAULT_CSS);
    setJs(DEFAULT_JS);
    setUserInput('');
    setDeviceSizeState('full');
  }

  function toggleEditor() {
    setEditorVisible((v) => !v);
    setOverlayVisible((v) => !v);
  }

  async function generateCode() {
    if (!userInput.trim()) return;
    const input = userInput.trim();
    setChatHistory((h) => [...h, `You: ${escapeHtml(input)}`, `AI: Loading...`]);
    setLoading(true);

    const messages = [
      { role: 'system', content: 'You are a coding assistant that generates or modifies HTML, CSS, and JS code. Always return the complete, updated, and fully functional code. Return code blocks with delimiters: ```html``` ```css``` ```javascript```.' },
      { role: 'user', content: `Here is the current code:\n\nHTML:\n${html}\n\nCSS:\n${css}\n\nJS:\n${js}\n\nNow: ${input}` },
    ];

    try {
      const res = await dualChat(messages as any, { preferred: preferredProvider, model: selectedModel as any, timeoutMs: 30000 });
      const text = res.content || '';

      setChatHistory((h) => h.filter((x) => x !== 'AI: Loading...'));
      setChatHistory((h) => [...h, `AI (${res.provider}): ${escapeHtml(text.slice(0, 300))}${text.length > 300 ? '...' : ''}`]);

      const htmlMatch = text.match(/```html\n([\s\S]*?)\n```/);
      const cssMatch = text.match(/```css\n([\s\S]*?)\n```/);
      const jsMatch = text.match(/```javascript\n([\s\S]*?)\n```/);

      if (htmlMatch) setHtml(htmlMatch[1].trim());
      if (cssMatch) setCss(cssMatch[1].trim());
      if (jsMatch) setJs(jsMatch[1].trim());

      setTab('output');
    } catch (e) {
      setChatHistory((h) => h.filter((x) => x !== 'AI: Loading...'));
      setChatHistory((h) => [...h, `AI (${selectedModel}): Error generating code`]);
      console.error(e);
    } finally {
      setLoading(false);
      setUserInput('');
    }
  }

  function importFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = String(ev.target?.result || '');
        if (file.name.endsWith('.html')) setHtml(content);
        else if (file.name.endsWith('.css')) setCss(content);
        else if (file.name.endsWith('.js')) setJs(content);
      };
      reader.readAsText(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function openInNewTab() {
    const full = combinedSrcDoc;
    const w = window.open();
    if (!w) {
      alert('Please allow popups');
      return;
    }
    w.document.open();
    w.document.write(full);
    w.document.close();
  }

  async function downloadZip() {
    const zipAvailable = typeof (window as any).JSZip !== 'undefined';
    if (!zipAvailable) {
      const blob = new Blob([combinedSrcDoc], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'preview.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }
    try {
      const zip = new (window as any).JSZip();
      zip.file('index.html', html);
      zip.file('styles.css', css);
      zip.file('script.js', js);
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vibe-coder-files.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    const iframe = iframeRef.current;
    const content = document.querySelector('.content') as HTMLElement | null;
    if (!iframe || !content) return;
    const maxWidth = Math.max(0, content.clientWidth - 20);
    const maxHeight = Math.max(0, content.clientHeight - 20);
    switch (deviceSize) {
      case 'iphone':
        iframe.style.width = Math.min(320, maxWidth) + 'px';
        iframe.style.height = Math.min(568, maxHeight) + 'px';
        break;
      case 'ipad':
        iframe.style.width = Math.min(768, maxWidth) + 'px';
        iframe.style.height = Math.min(1024, maxHeight) + 'px';
        break;
      case 'desktop':
        iframe.style.width = Math.min(1280, maxWidth) + 'px';
        iframe.style.height = Math.min(720, maxHeight) + 'px';
        break;
      case 'full':
      default:
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        break;
    }
  }, [deviceSize, combinedSrcDoc]);

  return (
    <div className="flex w-full gap-4">
      {/* overlay to dim left side when editor slides in on mobile */}
      <div className={`overlay transition-opacity ${overlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={toggleEditor} />

      <aside className="left-panel w-80 min-w-[220px] bg-white/60 dark:bg-gray-900/60 border rounded-lg shadow-sm flex flex-col overflow-hidden">
        <div className="chat-header px-4 py-3 bg-white/80 dark:bg-gray-900/80 border-b flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Chat</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Generate and iterate on code</div>
          </div>
          <div className="flex items-center gap-2">
            <button title="New chat" onClick={startNewChat} className="px-2 py-1 rounded border bg-transparent text-sm hover:bg-gray-50 dark:hover:bg-gray-800">➕</button>
            <select aria-label="Select model" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="text-xs p-1 rounded border bg-transparent">
              <option value="openai">OpenAI GPT-4o-mini</option>
              <option value="openai-large">OpenAI GPT-4o</option>
              <option value="qwen-coder">Qwen 2.5 Coder</option>
              <option value="llama">Llama 3.3 70B</option>
              <option value="mistral">Mistral</option>
            </select>
          </div>
        </div>

        <div className="chat px-4 py-3 flex-1 overflow-auto" ref={chatRef}>
          {chatHistory.length === 0 ? (
            <div className="text-sm text-gray-500">No messages yet. Type a prompt below to generate code.</div>
          ) : (
            chatHistory.map((m, i) => {
              const isUser = m.startsWith('You:');
              return (
                <div key={i} className={`mb-3 max-w-full ${isUser ? 'self-end text-right' : 'self-start text-left'}`}>
                  <div className={`${isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'} inline-block px-3 py-2 rounded-lg leading-relaxed`} style={{ whiteSpace: 'pre-wrap' }}>
                    <span dangerouslySetInnerHTML={{ __html: m.replace(/^(You:|AI \([^)]*\):)\s*/, '<strong>$1</strong> ') }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="chat-input px-4 py-3 bg-white/90 dark:bg-gray-900/90 border-t flex items-center gap-3">
          <input aria-label="Prompt" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') generateCode(); }} placeholder="Describe what you want (e.g. add a navbar)" className="flex-1 px-3 py-2 rounded border bg-white dark:bg-gray-800 text-sm" />
          <button aria-label="Generate" onClick={generateCode} disabled={loading} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Spinner /> : <Play size={14} />}
            <span className="text-sm">Run</span>
          </button>
        </div>
      </aside>

      <section className={`right-panel flex-1 flex flex-col bg-white/60 dark:bg-gray-900/60 border rounded-lg shadow-sm overflow-hidden ${editorVisible ? '' : 'hidden'}`}>
        <div className="toolbar px-4 py-2 flex items-center gap-3 bg-white/80 dark:bg-gray-900/80 border-b">
          <button title="Close editor (mobile)" onClick={toggleEditor} className="close-btn p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 hidden sm:inline-flex"><X size={16} /></button>

          <div className="flex items-center gap-2">
            <button onClick={downloadZip} title="Download ZIP" className="px-2 py-1 rounded border bg-transparent text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"><Download size={14} />Download</button>
            <button onClick={openInNewTab} title="Open preview in new tab" className="px-2 py-1 rounded border bg-transparent text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"><ExternalLink size={14} />Preview</button>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme" className="px-2 py-1 rounded border bg-transparent text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} Theme</button>
            <label className="px-2 py-1 rounded border bg-transparent text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer">Import<input ref={fileInputRef} type="file" multiple accept=".html,.css,.js" className="hidden" onChange={importFiles} /></label>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <select aria-label="Device size" value={deviceSize} onChange={(e) => setDeviceSizeState(e.target.value as any)} className="text-sm p-1 rounded border bg-transparent">
              <option value="full">Full Size</option>
              <option value="iphone">iPhone (320x568)</option>
              <option value="ipad">iPad (768x1024)</option>
              <option value="desktop">Desktop (1280x720)</option>
            </select>
          </div>
        </div>

        <div className="tabs flex bg-transparent border-b">
          <button onClick={() => switchTab('html')} className={`tab px-3 py-2 text-sm flex-1 ${tab === 'html' ? 'bg-white dark:bg-gray-900 font-medium' : 'bg-transparent'}`}><CodeIcon size={14} className="inline-block mr-2" />HTML</button>
          <button onClick={() => switchTab('css')} className={`tab px-3 py-2 text-sm flex-1 ${tab === 'css' ? 'bg-white dark:bg-gray-900 font-medium' : 'bg-transparent'}`}>CSS</button>
          <button onClick={() => switchTab('js')} className={`tab px-3 py-2 text-sm flex-1 ${tab === 'js' ? 'bg-white dark:bg-gray-900 font-medium' : 'bg-transparent'}`}>JS</button>
          <button onClick={() => switchTab('output')} className={`tab px-3 py-2 text-sm flex-1 ${tab === 'output' ? 'bg-white dark:bg-gray-900 font-medium' : 'bg-transparent'}`}>Output</button>
        </div>

        <div className="content flex-1 p-4 overflow-auto bg-white dark:bg-gray-900">
          <div className={`${tab === 'html' ? '' : 'hidden'} w-full h-[420px] rounded border bg-white dark:bg-gray-900 p-0`}>
            <div ref={(el) => { if (el && ! (el as any).__cm_init) { (el as any).__cm_container = el; } }} className="h-full" id="cm-html" />
            <div className="flex gap-2 p-2 border-t bg-gray-50 dark:bg-gray-800">
              <button onClick={() => cmAction('undo')} className="px-2 py-1 rounded border text-sm">Undo</button>
              <button onClick={() => cmAction('redo')} className="px-2 py-1 rounded border text-sm">Redo</button>
              <button onClick={() => cmAction('format')} className="px-2 py-1 rounded border bg-blue-600 text-white text-sm">Format</button>
            </div>
          </div>

          <div className={`${tab === 'css' ? '' : 'hidden'} w-full h-[420px] rounded border bg-white dark:bg-gray-900 p-0`}>
            <div ref={(el) => { if (el && ! (el as any).__cm_init) { (el as any).__cm_container = el; } }} className="h-full" id="cm-css" />
            <div className="flex gap-2 p-2 border-t bg-gray-50 dark:bg-gray-800">
              <button onClick={() => cmAction('undo')} className="px-2 py-1 rounded border text-sm">Undo</button>
              <button onClick={() => cmAction('redo')} className="px-2 py-1 rounded border text-sm">Redo</button>
              <button onClick={() => cmAction('format')} className="px-2 py-1 rounded border bg-blue-600 text-white text-sm">Format</button>
            </div>
          </div>

          <div className={`${tab === 'js' ? '' : 'hidden'} w-full h-[420px] rounded border bg-white dark:bg-gray-900 p-0`}>
            <div ref={(el) => { if (el && ! (el as any).__cm_init) { (el as any).__cm_container = el; } }} className="h-full" id="cm-js" />
            <div className="flex gap-2 p-2 border-t bg-gray-50 dark:bg-gray-800">
              <button onClick={() => cmAction('undo')} className="px-2 py-1 rounded border text-sm">Undo</button>
              <button onClick={() => cmAction('redo')} className="px-2 py-1 rounded border text-sm">Redo</button>
              <button onClick={() => cmAction('format')} className="px-2 py-1 rounded border bg-blue-600 text-white text-sm">Format</button>
            </div>
          </div>

          <div className={`${tab === 'output' ? '' : 'hidden'} w-full h-[520px] rounded border overflow-hidden`}>
            <iframe title="preview" ref={iframeRef} className="w-full h-full" sandbox="allow-scripts allow-forms allow-same-origin" />
          </div>
        </div>
      </section>
    </div>
  );
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

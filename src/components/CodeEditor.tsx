import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dualChat } from '../services/ai';
import { useSettings } from '../contexts/SettingsContext';
import { Download, ExternalLink, X, Code as CodeIcon, Play } from 'lucide-react';
function UploadIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);}

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
  const { preferredProvider, theme, setTheme, puterSignedIn, pollinationsModels, puterModels, activeModels } = useSettings();

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
    // ensure editor resizes when tab switches
    setTimeout(() => {
      const cur = to === 'html' ? cmHtmlRef.current : to === 'css' ? cmCssRef.current : cmJsRef.current;
      if (cur && cur.refresh && cur.getScrollInfo) {
        try { const info = cur.getScrollInfo(); cur.setSize('100%', Math.min(900, Math.max(120, info.height + 16)) + 'px'); cur.refresh(); } catch (e) { /* ignore */ }
      }
    }, 60);
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
    const w = window.open('', '_blank', 'noopener');
    if (!w) {
      alert('Please allow popups');
      return;
    }
    try {
      w.document.open();
      w.document.write(full);
      w.document.close();
      w.focus();
    } catch (e) {
      // Fallback: create blob and open URL
      const blob = new Blob([full], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }

  function copyCode(kind: 'html' | 'css' | 'js') {
    let text = '';
    if (kind === 'html') text = cmHtmlRef.current ? cmHtmlRef.current.getValue() : html;
    if (kind === 'css') text = cmCssRef.current ? cmCssRef.current.getValue() : css;
    if (kind === 'js') text = cmJsRef.current ? cmJsRef.current.getValue() : js;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      // small UI feedback could be added
    }).catch(() => {
      alert('Copy failed');
    });
  }

  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);

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

  // CodeMirror refs
  const cmHtmlRef = useRef<any>(null);
  const cmCssRef = useRef<any>(null);
  const cmJsRef = useRef<any>(null);
  const cmContainersRef = useRef<{ html?: HTMLDivElement | null; css?: HTMLDivElement | null; js?: HTMLDivElement | null }>({});

  // Initialize CodeMirror editors once the scripts are available
  useEffect(() => {
    let mounted = true;
    function initOnce() {
      const CM = (window as any).CodeMirror;
      if (!CM) return false;
      // HTML editor
      const approxLineHeight = 20;
      function setAutoHeight(cmInstance: any) {
        try {
          // prefer measuring content height directly when available
          const info = cmInstance.getScrollInfo ? cmInstance.getScrollInfo() : null;
          let height = 0;
          if (info && typeof info.height === 'number') {
            height = Math.min(900, Math.max(120, info.height + 16));
          } else {
            const lines = Math.max(1, cmInstance.lineCount());
            height = Math.min(900, Math.max(120, lines * approxLineHeight + 20));
          }
          cmInstance.setSize('100%', height + 'px');
          // ensure layout refresh
          if (cmInstance.refresh) cmInstance.refresh();
        } catch (e) { /* ignore */ }
      }

      if (!cmHtmlRef.current && cmContainersRef.current.html) {
        cmHtmlRef.current = CM(cmContainersRef.current.html, {
          value: html,
          mode: 'htmlmixed',
          lineNumbers: true,
          autoCloseBrackets: true,
          tabSize: 2,
        });
        cmHtmlRef.current.on('change', (cm: any) => { setHtml(cm.getValue()); setAutoHeight(cm); });
        setAutoHeight(cmHtmlRef.current);
      }
      // CSS editor
      if (!cmCssRef.current && cmContainersRef.current.css) {
        cmCssRef.current = CM(cmContainersRef.current.css, {
          value: css,
          mode: 'css',
          lineNumbers: true,
          autoCloseBrackets: true,
          tabSize: 2,
        });
        cmCssRef.current.on('change', (cm: any) => { setCss(cm.getValue()); setAutoHeight(cm); });
        setAutoHeight(cmCssRef.current);
      }
      // JS editor
      if (!cmJsRef.current && cmContainersRef.current.js) {
        cmJsRef.current = CM(cmContainersRef.current.js, {
          value: js,
          mode: 'javascript',
          lineNumbers: true,
          autoCloseBrackets: true,
          tabSize: 2,
        });
        cmJsRef.current.on('change', (cm: any) => { setJs(cm.getValue()); setAutoHeight(cm); });
        setAutoHeight(cmJsRef.current);
      }
      return true;
    }

    const tryInit = () => {
      if (!mounted) return;
      const ok = initOnce();
      if (!ok) setTimeout(tryInit, 300);
    };

    tryInit();
    return () => { mounted = false; };
  }, [html, css, js]);

  function cmAction(action: 'undo' | 'redo' | 'format') {
    const current = tab === 'html' ? cmHtmlRef.current : tab === 'css' ? cmCssRef.current : cmJsRef.current;
    if (!current) return;
    if (action === 'undo') return current.undo();
    if (action === 'redo') return current.redo();
    if (action === 'format') {
      try {
        const prettier = (window as any).prettier;
        const plugins = (window as any).prettierPlugins || {};
        const val = current.getValue();
        let parser = 'babel';
        let plugin: any = plugins.babel;
        if (tab === 'html') { parser = 'html'; plugin = plugins.html; }
        if (tab === 'css') { parser = 'css'; plugin = plugins.postcss; }
        const formatted = prettier.format(val, { parser: parser === 'css' ? 'css' : parser, plugins: [plugin] });
        current.setValue(formatted);
      } catch (e) {
        console.error('Format failed', e);
      }
    }
  }

  // Keep CodeMirror editors in sync when state changes externally (e.g. AI inserts code)
  useEffect(() => {
    try {
      if (cmHtmlRef.current && typeof cmHtmlRef.current.getValue === 'function') {
        if (cmHtmlRef.current.getValue() !== html) cmHtmlRef.current.setValue(html);
        setTimeout(() => { if (cmHtmlRef.current.refresh) cmHtmlRef.current.refresh(); }, 40);
      }
      if (cmCssRef.current && typeof cmCssRef.current.getValue === 'function') {
        if (cmCssRef.current.getValue() !== css) cmCssRef.current.setValue(css);
        setTimeout(() => { if (cmCssRef.current.refresh) cmCssRef.current.refresh(); }, 40);
      }
      if (cmJsRef.current && typeof cmJsRef.current.getValue === 'function') {
        if (cmJsRef.current.getValue() !== js) cmJsRef.current.setValue(js);
        setTimeout(() => { if (cmJsRef.current.refresh) cmJsRef.current.refresh(); }, 40);
      }
    } catch (e) {
      // ignore
    }

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
    <div className="flex w-full gap-4 flex-nowrap items-start">
      {/* overlay to dim left side when editor slides in on mobile */}
      <div className={`overlay transition-opacity ${overlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={toggleEditor} />

      <aside className={`left-panel w-80 min-w-[220px] flex-shrink-0 bg-white/60 dark:bg-gray-900/60 border rounded-lg shadow-sm flex flex-col overflow-hidden ${loading ? 'pulse-green' : ''}`}>
        <div className="chat-header px-3 py-2 bg-white/80 dark:bg-gray-900/80 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button title="New chat" onClick={startNewChat} className="btn">➕</button>
            <div>
              <div className="text-sm font-semibold">Chat</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs px-2 py-1 rounded border bg-transparent">{preferredProvider === 'puter' ? (puterSignedIn ? 'Puter' : 'Puter (signin)') : 'Pollinations'}</div>
            <select aria-label="Select model" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="text-xs p-1 rounded border bg-transparent">
              {
                // Build options from active models; if none enabled, fallback to defaults
                (() => {
                  const enabled = [ ...(pollinationsModels || []), ...(puterModels || []) ].filter(m => !!activeModels[m]);
                  if (enabled.length === 0) {
                    return [
                      <option key="openai" value="openai">GPT-4o-mini</option>,
                      <option key="openai-large" value="openai-large">GPT-4o</option>,
                      <option key="qwen-coder" value="qwen-coder">Qwen 2.5 Coder</option>,
                      <option key="llama" value="llama">Llama 3.3 70B</option>,
                      <option key="mistral" value="mistral">Mistral</option>,
                    ];
                  }
                  return enabled.map((m) => <option key={m} value={m}>{m}</option>);
                })()
              }
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
          <button aria-label="Generate" onClick={generateCode} disabled={loading} className="btn btn-primary flex items-center gap-2">
            {loading ? <Spinner /> : <Play size={14} />}
            <span className="text-sm">Run</span>
          </button>
        </div>
      </aside>

      <section className={`right-panel flex-1 min-w-0 flex flex-col bg-white/60 dark:bg-gray-900/60 border rounded-lg shadow-sm overflow-visible ${editorVisible ? '' : 'hidden'}`}>
        <div className="toolbar px-4 py-2 flex items-center bg-white/80 dark:bg-gray-900/80 border-b relative z-10 overflow-visible">
          <button title="Close editor (mobile)" onClick={toggleEditor} className="close-btn p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 hidden sm:inline-flex"><X size={16} /></button>

          <div className="flex-1 flex items-center justify-center gap-3">
            <button onClick={downloadZip} title="Download ZIP" className="btn"><Download size={16} /></button>
            <button onClick={openInNewTab} title="Open preview in new tab" className="btn"><ExternalLink size={16} /></button>
            <button title="Import files" onClick={() => fileInputRef.current?.click()} className="btn"><UploadIcon /></button>
            <input ref={fileInputRef} type="file" multiple accept=".html,.css,.js" className="hidden" onChange={importFiles} />
          </div>

          <div className="ml-auto flex items-center gap-2 relative">
            <button title="Device size" onClick={() => setDeviceMenuOpen((s) => !s)} className="p-2 rounded border bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="16" width="10" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
            {deviceMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border rounded shadow device-menu" style={{ top: 'calc(100% + 6px)' }}>
                <button onClick={() => { setDeviceSizeState('full'); setDeviceMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm">Full Size</button>
                <button onClick={() => { setDeviceSizeState('iphone'); setDeviceMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm">iPhone (320x568)</button>
                <button onClick={() => { setDeviceSizeState('ipad'); setDeviceMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm">iPad (768x1024)</button>
                <button onClick={() => { setDeviceSizeState('desktop'); setDeviceMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm">Desktop (1280x720)</button>
              </div>
            )}
          </div>
        </div>

        <div className="tabs flex bg-transparent border-b">
          <button onClick={() => switchTab('html')} className={`tab px-3 py-2 text-sm flex-1 ${tab === 'html' ? 'bg-white dark:bg-gray-900 font-medium' : 'bg-transparent'}`}><CodeIcon size={14} className="inline-block mr-2" />HTML</button>
          <button onClick={() => switchTab('css')} className={`tab px-3 py-2 text-sm flex-1 ${tab === 'css' ? 'bg-white dark:bg-gray-900 font-medium' : 'bg-transparent'}`}>CSS</button>
          <button onClick={() => switchTab('js')} className={`tab px-3 py-2 text-sm flex-1 ${tab === 'js' ? 'bg-white dark:bg-gray-900 font-medium' : 'bg-transparent'}`}>JS</button>
          <button onClick={() => switchTab('output')} className={`tab px-3 py-2 text-sm flex-1 ${tab === 'output' ? 'bg-white dark:bg-gray-900 font-medium' : 'bg-transparent'}`}>Output</button>
        </div>

        <div className="content flex-1 p-4 overflow-auto bg-white dark:bg-gray-900">
          <div className={`${tab === 'html' ? '' : 'hidden'} w-full rounded border bg-white dark:bg-gray-900 p-0 flex flex-col`}>
            <div ref={(el) => { cmContainersRef.current.html = el; }} className="min-h-[120px]" id="cm-html" />
            <div className="flex gap-2 p-2 border-t bg-gray-50 dark:bg-gray-800">
              <button onClick={() => cmAction('undo')} className="btn">Undo</button>
              <button onClick={() => cmAction('redo')} className="btn">Redo</button>
              <button onClick={() => cmAction('format')} className="btn btn-primary">Format</button>
              <button onClick={() => copyCode('html')} className="btn">Copy</button>
            </div>
          </div>

          <div className={`${tab === 'css' ? '' : 'hidden'} w-full rounded border bg-white dark:bg-gray-900 p-0 flex flex-col`}>
            <div ref={(el) => { cmContainersRef.current.css = el; }} className="min-h-[120px]" id="cm-css" />
            <div className="flex gap-2 p-2 border-t bg-gray-50 dark:bg-gray-800">
              <button onClick={() => cmAction('undo')} className="btn">Undo</button>
              <button onClick={() => cmAction('redo')} className="btn">Redo</button>
              <button onClick={() => cmAction('format')} className="btn btn-primary">Format</button>
              <button onClick={() => copyCode('css')} className="btn">Copy</button>
            </div>
          </div>

          <div className={`${tab === 'js' ? '' : 'hidden'} w-full rounded border bg-white dark:bg-gray-900 p-0 flex flex-col`}>
            <div ref={(el) => { cmContainersRef.current.js = el; }} className="min-h-[120px]" id="cm-js" />
            <div className="flex gap-2 p-2 border-t bg-gray-50 dark:bg-gray-800">
              <button onClick={() => cmAction('undo')} className="btn">Undo</button>
              <button onClick={() => cmAction('redo')} className="btn">Redo</button>
              <button onClick={() => cmAction('format')} className="btn btn-primary">Format</button>
              <button onClick={() => copyCode('js')} className="btn">Copy</button>
            </div>
          </div>

          <div className={`${tab === 'output' ? '' : 'hidden'} w-full rounded border overflow-hidden flex-1 min-h-[200px]`}>
            <iframe title="preview" ref={iframeRef} className="w-full h-full flex-1" sandbox="allow-scripts allow-forms allow-same-origin" />
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

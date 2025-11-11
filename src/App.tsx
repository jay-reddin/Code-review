import { Header } from './components/Header';
import { SettingsProvider } from './contexts/SettingsContext';
import { CodeEditor } from './components/CodeEditor';

function App() {
  return (
    <SettingsProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-lg border border-gray-300 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Editor & Preview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Edit HTML, CSS and JavaScript on the left. Preview updates live on the right.</p>
            <div className="mt-4">
              <CodeEditor />
            </div>
          </div>
        </main>
      </div>
    </SettingsProvider>
  );
}

export default App;

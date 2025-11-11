import { Header } from './components/Header';
import { SettingsProvider } from './contexts/SettingsContext';
import { CodeEditor } from './components/CodeEditor';

function App() {
  return (
    <SettingsProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-4">
          <div className="rounded-lg border border-gray-300 dark:border-gray-800 p-4">
            <h2 className="text-lg font-semibold mb-2 text-center">Editor & Preview</h2>
            <div className="mt-2">
              <CodeEditor />
            </div>
          </div>
        </main>
      </div>
    </SettingsProvider>
  );
}

export default App;

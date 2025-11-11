declare global {
  interface Window {
    puter?: {
      auth: {
        isSignedIn: () => Promise<boolean> | boolean;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
        getUser: () => Promise<{ id?: string; email?: string; name?: string } | null>;
      };
      ai?: {
        chat: (options: { messages: { role: 'user' | 'assistant' | 'system'; content: string }[]; model?: string }) => Promise<{ content: string }>;
      };
    };
  }
}

export {};

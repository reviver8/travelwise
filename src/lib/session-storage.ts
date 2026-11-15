// Native: expo-sqlite provides a persistent `localStorage` global for the Supabase session.
// The web version (session-storage.web.ts) uses the browser's storage instead, so web bundles
// never import expo-sqlite (its web build needs extra WebAssembly setup we don't use).
import 'expo-sqlite/localStorage/install';

export const authStorage = localStorage;
export const canPersistSession = true;

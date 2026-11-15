// Web: use the browser's localStorage. It doesn't exist during static rendering on the server,
// where there is no session to keep anyway.
const isServer = typeof window === 'undefined';

export const authStorage = isServer ? undefined : window.localStorage;
export const canPersistSession = !isServer;

/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, loadSession, saveSession, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);

  const login = useCallback((role, { token, user }) => {
    const s = { role, token, user };
    saveSession(s);
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    saveSession(null);
    setSession(null);
  }, []);

  const setUser = useCallback((user) => {
    setSession((s) => {
      const next = { ...s, user };
      saveSession(next);
      return next;
    });
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  // Bound helper so pages can call request('/intern/tasks') without passing the token.
  const request = useCallback(
    (path, opts = {}) => api(path, { ...opts, token: session?.token }),
    [session?.token]
  );

  const value = useMemo(
    () => ({ session, login, logout, setUser, request }),
    [session, login, logout, setUser, request]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "./api";
import { setTrackerToken } from "./tracker";
import type { User } from "./types";

const TOKEN_KEY = "growise_token";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  authenticating: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, trackingOptIn: boolean) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  // Tracker sync happens inline wherever token+user become known (applyToken,
  // hydration below) rather than via a reactive effect — a `track()` call made
  // immediately after signup()/login() resolves must never race against an
  // effect that hasn't flushed yet.
  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      const finishHydration = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(finishHydration);
    }
    authApi
      .me(stored)
      .then((me) => {
        // Keep the anonymous UI in place until the stored session has been
        // verified. This prevents the navbar from jumping to a signed-in state.
        setToken(stored);
        setUser(me);
        setTrackerToken(me.tracking_opt_in ? stored : null);
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const applyToken = useCallback(async (accessToken: string) => {
    const me = await authApi.me(accessToken);
    // A login response alone is not a confirmed session. Commit it only once
    // /me succeeds so every user-specific surface changes together.
    window.localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setUser(me);
    setTrackerToken(me.tracking_opt_in ? accessToken : null);
    return me;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setAuthenticating(true);
      try {
        const res = await authApi.login(email, password);
        return await applyToken(res.access_token);
      } finally {
        setAuthenticating(false);
      }
    },
    [applyToken]
  );

  const signup = useCallback(
    async (email: string, password: string, trackingOptIn: boolean) => {
      setAuthenticating(true);
      try {
        const res = await authApi.signup(email, password, trackingOptIn);
        return await applyToken(res.access_token);
      } finally {
        setAuthenticating(false);
      }
    },
    [applyToken]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setTrackerToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, authenticating, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

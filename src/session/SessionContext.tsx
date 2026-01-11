import { supabase } from "@/src/lib/supabase";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type SessionCtx = {
  sessionId: string | null;
  loadingSession: boolean;
  ensureSession: () => Promise<string>;
  resetSession: () => Promise<void>;
};

const SessionContext = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);

  const createSession = useCallback(async () => {
    const { data, error } = await supabase
      .from("cleanup_sessions")
      .insert({})
      .select("id")
      .single();

    if (error) throw error;
    return data.id as string;
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;

    setLoadingSession(true);
    try {
      const id = await createSession();
      setSessionId(id);
      return id;
    } finally {
      setLoadingSession(false);
    }
  }, [createSession, sessionId]);

  // Create one session when the app starts
  useEffect(() => {
    ensureSession().catch((e) => {
      console.error("Failed to create session:", e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetSession = useCallback(async () => {
    // Start a new cleanup “run”
    setLoadingSession(true);
    try {
      const id = await createSession();
      setSessionId(id);
    } finally {
      setLoadingSession(false);
    }
  }, [createSession]);

  const value = useMemo(
    () => ({ sessionId, loadingSession, ensureSession, resetSession }),
    [sessionId, loadingSession, ensureSession, resetSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
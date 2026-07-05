"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { auth } from "@/lib/firebase/client";
import { ensureUserDocument } from "./approval";
import type { UserDoc } from "./types";

type AuthStatus = "loading" | "signed-out" | "not-approved" | "ready";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  userDoc: UserDoc | null;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);

  const resolveUser = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setUser(null);
      setUserDoc(null);
      setStatus("signed-out");
      return;
    }

    setUser(firebaseUser);
    const doc = await ensureUserDocument(firebaseUser);
    if (!doc) {
      setUserDoc(null);
      setStatus("not-approved");
      return;
    }

    setUserDoc(doc);
    setStatus("ready");
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      void resolveUser(firebaseUser);
    });
  }, [resolveUser]);

  const refreshUserDoc = useCallback(async () => {
    if (auth.currentUser) {
      await resolveUser(auth.currentUser);
    }
  }, [resolveUser]);

  return (
    <AuthContext.Provider value={{ status, user, userDoc, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
}

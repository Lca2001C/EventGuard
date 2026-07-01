"use client";

import { useRouter } from "next/navigation";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getSession, Session, setSession } from "@/lib/api";

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    companyName: string;
    email: string;
    password: string;
    confirmPassword: string;
    termsAccepted: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const [session, setLocalSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocalSession(getSession());
    setReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      async login(email, password) {
        const { data } = await api.post<Session>("/auth/login", { email, password });
        setSession(data);
        setLocalSession(data);
        toast.success("Login realizado");
        router.push("/dashboard");
      },
      async register(input) {
        const { data } = await api.post<Session>("/auth/register", input);
        setSession(data);
        setLocalSession(data);
        toast.success("Conta criada");
        router.push("/dashboard");
      },
      async logout() {
        const current = getSession();
        if (current?.refreshToken) {
          await api.post("/auth/logout", { refreshToken: current.refreshToken }).catch(() => null);
        }

        setSession(null);
        setLocalSession(null);
        router.push("/login");
      }
    }),
    [ready, router, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

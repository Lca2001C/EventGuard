"use client";

import { useRouter } from "next/navigation";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { gravarSessao, lerSessao, mensagemDeErro } from "@/platform/http/cliente-http";
import { exigeSegundoFator, type CadastroDeConta, type Session } from "../domain/sessao";
import { authApi } from "../infrastructure/identidade.api";

type LoginResult = { twoFactorRequired: boolean };

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyTwoFactor: (code: string) => Promise<void>;
  register: (input: CadastroDeConta) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Caso de uso de sessão no front: entrar, 2FA, cadastro, renovar perfil e sair. */
export function AuthProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const [session, setLocalSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  useEffect(() => {
    const existing = lerSessao<Session>();
    setLocalSession(existing);
    setReady(true);

    if (existing?.accessToken) {
      authApi.me().catch(() => {
        gravarSessao(null);
        setLocalSession(null);
      });
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    function iniciarSessao(nextSession: Session, mensagem: string) {
      gravarSessao(nextSession);
      setLocalSession(nextSession);
      toast.success(mensagem);
      router.push("/dashboard");
    }

    return {
      session,
      ready,
      async login(email, password) {
        try {
          const data = await authApi.login(email, password);

          if (exigeSegundoFator(data)) {
            setChallengeToken(data.challengeToken);
            return { twoFactorRequired: true };
          }

          iniciarSessao(data, "Login realizado");
          return { twoFactorRequired: false };
        } catch (error) {
          toast.error(mensagemDeErro(error, "Nao foi possivel entrar"));
          throw error;
        }
      },
      async verifyTwoFactor(code) {
        if (!challengeToken) {
          throw new Error("Nenhum desafio de 2FA pendente");
        }

        try {
          const data = await authApi.verifyTwoFactor(challengeToken, code);
          setChallengeToken(null);
          iniciarSessao(data, "Login realizado");
        } catch (error) {
          toast.error(mensagemDeErro(error, "Codigo invalido"));
          throw error;
        }
      },
      async register(input) {
        try {
          iniciarSessao(await authApi.register(input), "Conta criada");
        } catch (error) {
          toast.error(mensagemDeErro(error, "Nao foi possivel criar a conta"));
          throw error;
        }
      },
      async refresh() {
        const current = lerSessao<Session>();
        if (!current) {
          return;
        }
        const data = await authApi.me();
        const next: Session = { ...current, user: { ...current.user, ...data } };
        gravarSessao(next);
        setLocalSession(next);
      },
      async logout() {
        const current = lerSessao<Session>();
        if (current?.refreshToken) {
          await authApi.logout(current.refreshToken).catch(() => null);
        }

        gravarSessao(null);
        setLocalSession(null);
        router.push("/login");
      }
    };
  }, [challengeToken, ready, router, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

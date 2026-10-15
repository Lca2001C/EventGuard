"use client";

import axios from "axios";
import type { AxiosRequestConfig } from "axios";

/**
 * Cliente HTTP da API. Guarda os tokens da sessão no sessionStorage, injeta
 * o access token e renova a sessão uma vez quando a API responde 401.
 * Não conhece o modelo de usuário: isso é da Identidade.
 */

export type TokensDaSessao = {
  accessToken: string;
  refreshToken: string;
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SESSION_KEY = "eventguard.session";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
});

export function lerSessao<T extends TokensDaSessao = TokensDaSessao>(): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export function gravarSessao(session: TokensDaSessao | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.sessionStorage.removeItem(SESSION_KEY);
    return;
  }

  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

api.interceptors.request.use((config) => {
  const session = lerSessao();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const session = lerSessao();
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && session?.refreshToken && original && !original._retry) {
      original._retry = true;
      const { data } = await axios.post<TokensDaSessao>(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: session.refreshToken
      });
      gravarSessao(data);
      return api.request(original);
    }

    throw error;
  }
);

export async function withFallback<T>(request: Promise<{ data: T }>, fallback: T): Promise<T> {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[api] request failed, using fallback data", error);
    }
    return fallback;
  }
}

/** Baixa um arquivo autenticado da API e dispara o download no navegador. */
export async function baixarArquivo(caminho: string, nomeDoArquivo: string): Promise<void> {
  const session = lerSessao();
  const response = await fetch(`${API_BASE_URL}${caminho}`, {
    headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : undefined
  });
  if (!response.ok) {
    throw new Error(`Report download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = nomeDoArquivo;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

/** Mensagem de erro da API (string ou lista do ValidationPipe), ou o texto padrão. */
export function mensagemDeErro(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    if (typeof message === "string") {
      return message;
    }
  }
  return fallback;
}

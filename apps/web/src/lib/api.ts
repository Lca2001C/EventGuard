"use client";

import axios from "axios";
import type { AxiosRequestConfig } from "axios";

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    tenantId: string | null;
    roles: string[];
    tenant?: {
      name: string;
      status: string;
      primaryColor: string;
    } | null;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:4000";
const SESSION_KEY = "eventguard.session";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000
});

export function getSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function setSession(session: Session | null) {
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
  const session = getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const session = getSession();
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && session?.refreshToken && original && !original._retry) {
      original._retry = true;
      const { data } = await axios.post<Session>(`${API_URL}/auth/refresh`, {
        refreshToken: session.refreshToken
      });
      setSession(data);
      return api.request(original);
    }

    throw error;
  }
);

export async function withFallback<T>(request: Promise<{ data: T }>, fallback: T): Promise<T> {
  try {
    const response = await request;
    return response.data;
  } catch {
    return fallback;
  }
}

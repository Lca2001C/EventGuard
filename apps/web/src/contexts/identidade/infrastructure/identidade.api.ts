import { api } from "@/platform/http/cliente-http";
import type {
  CadastroDeConta,
  NovoUsuario,
  RespostaDeLogin,
  Session,
  UserListItem
} from "../domain/sessao";

export const authApi = {
  async login(email: string, password: string): Promise<RespostaDeLogin> {
    const { data } = await api.post<RespostaDeLogin>("/auth/login", { email, password });
    return data;
  },
  async verifyTwoFactor(challengeToken: string, code: string): Promise<Session> {
    const { data } = await api.post<Session>("/auth/2fa/verify", { challengeToken, code });
    return data;
  },
  async register(input: CadastroDeConta): Promise<Session> {
    const { data } = await api.post<Session>("/auth/register", input);
    return data;
  },
  async me(): Promise<Session["user"]> {
    const { data } = await api.get<Session["user"]>("/auth/me");
    return data;
  },
  async logout(refreshToken: string) {
    await api.post("/auth/logout", { refreshToken });
  },
  async forgotPassword(email: string) {
    await api.post("/auth/forgot-password", { email });
  },
  async resetPassword(token: string, password: string) {
    await api.post("/auth/reset-password", { token, password });
  }
};

export const profileApi = {
  async updateName(name: string) {
    const { data } = await api.patch("/auth/profile", { name });
    return data;
  },
  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await api.post("/auth/change-password", { currentPassword, newPassword });
    return data;
  }
};

export const twoFactorApi = {
  async setup(): Promise<{ secret: string; otpauthUrl: string }> {
    const { data } = await api.post<{ secret: string; otpauthUrl: string }>("/auth/2fa/setup");
    return data;
  },
  async enable(code: string): Promise<{ ok: boolean; recoveryCodes: string[] }> {
    const { data } = await api.post<{ ok: boolean; recoveryCodes: string[] }>("/auth/2fa/enable", {
      code
    });
    return data;
  },
  async disable(code: string) {
    const { data } = await api.post("/auth/2fa/disable", { code });
    return data;
  }
};

export const usersApi = {
  async list(): Promise<UserListItem[]> {
    const { data } = await api.get<UserListItem[]>("/users");
    return data;
  },
  async create(input: NovoUsuario) {
    const { data } = await api.post("/users", input);
    return data;
  },
  async update(id: string, input: { name?: string; role?: string; status?: string }) {
    const { data } = await api.patch(`/users/${id}`, input);
    return data;
  }
};

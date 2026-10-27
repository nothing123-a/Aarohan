import apiClient from "./apiClient";
import type { User, ApiResponse } from "@/types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export const authService = {
  login: (payload: LoginPayload) =>
    apiClient.post<ApiResponse<LoginResponse>>("/auth/login", payload),

  logout: () =>
    apiClient.post<ApiResponse<null>>("/auth/logout"),

  me: () =>
    apiClient.get<ApiResponse<User>>("/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<ApiResponse<null>>("/auth/change-password", {
      currentPassword,
      newPassword,
    }),
};

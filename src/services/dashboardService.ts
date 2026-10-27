import apiClient from "./apiClient";
import type { DashboardStats, ApiResponse, Notification } from "@/types";

export const dashboardService = {
  getStats: () =>
    apiClient.get<ApiResponse<DashboardStats>>("/dashboard/stats"),

  getNotifications: (unreadOnly?: boolean) =>
    apiClient.get<ApiResponse<Notification[]>>("/notifications", {
      params: { unreadOnly },
    }),

  markNotificationRead: (id: string) =>
    apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`),

  markAllNotificationsRead: () =>
    apiClient.patch<ApiResponse<null>>("/notifications/read-all"),
};

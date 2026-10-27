import apiClient from "./apiClient";
import type { Notification, ApiResponse } from "@/types";

export interface NotificationsListResponse {
  success: boolean;
  data: Notification[];
  unreadCount?: number;
}

export const notificationService = {
  getAll: (unreadOnly: boolean = false) =>
    apiClient.get<NotificationsListResponse>("/notifications", {
      params: { unreadOnly },
    }),

  markAsRead: (id: string) =>
    apiClient.patch<ApiResponse<{ id: string; isRead: boolean }>>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.patch<ApiResponse<null>>("/notifications/read-all"),
};

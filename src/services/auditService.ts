import apiClient from "./apiClient";

export interface AuditLogItem {
  id: string;
  timestamp: string;
  action: string;
  actionType: "verification" | "renewal" | "release" | "auth" | "submission";
  actor: string;
  role: string;
  entityId: string;
  ipAddress: string;
  hash: string;
  fullHash: string;
  outcome: string;
  details?: Record<string, any>;
}

export interface AuditLogsResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  logs: AuditLogItem[];
}

export const auditService = {
  getLogs: (params?: { actionType?: string; search?: string; institutionId?: string; page?: number; limit?: number }) =>
    apiClient.get<AuditLogsResponse>("/audit/logs", {
      params: {
        action_type: params?.actionType,
        search: params?.search,
        institution_id: params?.institutionId,
        page: params?.page || 1,
        limit: params?.limit || 50,
      },
    }),
};

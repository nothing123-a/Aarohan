import apiClient from "./apiClient";
import type {
  FDR,
  FDRStatus,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

export interface FDRFilters extends PaginationParams {
  status?: FDRStatus;
  department?: string;
  bankName?: string;
  fromDate?: string;
  toDate?: string;
  maturingInDays?: number;
}

export interface CreateFDRPayload {
  depositorName: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  ifscCode: string;
  principalAmount: number;
  interestRate: number;
  depositDate: string;
  maturityDate: string;
  purpose: FDR["purpose"];
  contractNumber?: string;
  projectName?: string;
  department: string;
}

export const fdrService = {
  getAll: (filters?: FDRFilters) =>
    apiClient.get<ApiResponse<PaginatedResponse<FDR>>>("/fdrs", { params: filters }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<FDR>>(`/fdrs/${id}`),

  create: (payload: CreateFDRPayload) =>
    apiClient.post<ApiResponse<FDR>>("/fdrs", payload),

  update: (id: string, payload: Partial<CreateFDRPayload>) =>
    apiClient.put<ApiResponse<FDR>>(`/fdrs/${id}`, payload),

  submitForVerification: (id: string) =>
    apiClient.post<ApiResponse<FDR>>(`/fdrs/${id}/submit`),

  verify: (id: string, remarks?: string) =>
    apiClient.post<ApiResponse<FDR>>(`/fdrs/${id}/verify`, { remarks }),

  reject: (id: string, remarks: string) =>
    apiClient.post<ApiResponse<FDR>>(`/fdrs/${id}/reject`, { remarks }),

  requestRenewal: (id: string, reason: string) =>
    apiClient.post<ApiResponse<FDR>>(`/fdrs/${id}/renewal/request`, { reason }),

  approveRenewal: (id: string, newMaturityDate: string, remarks?: string) =>
    apiClient.post<ApiResponse<FDR>>(`/fdrs/${id}/renewal/approve`, {
      newMaturityDate,
      remarks,
    }),

  requestRelease: (id: string, reason: string) =>
    apiClient.post<ApiResponse<FDR>>(`/fdrs/${id}/release/request`, { reason }),

  approveRelease: (id: string, remarks?: string) =>
    apiClient.post<ApiResponse<FDR>>(`/fdrs/${id}/release/approve`, { remarks }),

  uploadDocument: (id: string, formData: FormData) =>
    apiClient.post<ApiResponse<FDR>>(`/fdrs/${id}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getMaturityAlerts: () =>
    apiClient.get<ApiResponse<FDR[]>>("/fdrs/alerts/maturity"),
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fdrService, type FDRFilters, type CreateFDRPayload } from "@/services/fdrService";
import type { FDR, ApiResponse, PaginatedResponse } from "@/types";

export function useFDRs(filters?: FDRFilters) {
  return useQuery<ApiResponse<PaginatedResponse<FDR>>>({
    queryKey: ["fdrs", filters],
    queryFn: async () => {
      const res = await fdrService.getAll(filters);
      return res.data;
    },
  });
}

export function useFDR(id: string) {
  return useQuery<ApiResponse<FDR>>({
    queryKey: ["fdr", id],
    queryFn: async () => {
      const res = await fdrService.getById(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useMaturityAlerts() {
  return useQuery<ApiResponse<FDR[]>>({
    queryKey: ["fdr-maturity-alerts"],
    queryFn: async () => {
      const res = await fdrService.getMaturityAlerts();
      return res.data;
    },
  });
}

export function useCreateFDR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFDRPayload) => fdrService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fdrs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useSubmitFDR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fdrService.submitForVerification(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["fdr", id] });
      queryClient.invalidateQueries({ queryKey: ["fdrs"] });
    },
  });
}

export function useVerifyFDR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      fdrService.verify(id, remarks),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fdr", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["fdrs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useRejectFDR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) =>
      fdrService.reject(id, remarks),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fdr", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["fdrs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

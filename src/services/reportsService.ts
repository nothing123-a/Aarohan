import apiClient from "./apiClient";
import type { ApiResponse } from "@/types";

export interface BankExposureItem {
  bank: string;
  count: number;
  total_amount: number;
  value: string;
  share: number;
}

export interface InstitutionSummaryItem {
  id: string;
  name: string;
  code: string;
  state: string;
  active_deposit: number;
  required_deposit: number;
  compliance_percentage: number;
  instruments_count: number;
}

export interface ReportsSummaryResponse {
  report_title: string;
  generated_at: string;
  total_instruments_count: number;
  totals: {
    total_principal: number;
    active_principal: number;
    matured_principal: number;
    released_principal: number;
  };
  status_distribution: Record<string, number>;
  maturity_summary: {
    within_7_days: number;
    within_30_days: number;
    within_60_days: number;
    within_90_days: number;
    past_maturity: number;
  };
  bank_exposures: BankExposureItem[];
  institution_summaries: InstitutionSummaryItem[];
}

export const reportsService = {
  getSummary: (params?: { startDate?: string; endDate?: string; institutionId?: string }) =>
    apiClient.get<ApiResponse<ReportsSummaryResponse>>("/reports/summary", {
      params: {
        start_date: params?.startDate,
        end_date: params?.endDate,
        institution_id: params?.institutionId,
      },
    }),

  exportCsv: async (params?: { institutionId?: string; statusFilter?: string }) => {
    const response = await apiClient.get("/reports/export-csv", {
      params: {
        institution_id: params?.institutionId,
        status_filter: params?.statusFilter,
      },
      responseType: "blob",
    });

    // Trigger browser file download
    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `fdr_master_register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

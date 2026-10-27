import apiClient from "./apiClient";
import type { ApiResponse } from "@/types";

export interface MaturityItem {
  id: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  bankName: string;
  branchName: string;
  amount: number;
  amountFormatted: string;
  issueDate: string;
  maturityDate: string;
  daysRemaining: number;
  lifecycleStatus: string;
  verificationStatus: string;
  severity: "urgent" | "warning" | "normal";
  reminderStatus: string;
  remindersCount: number;
  lastReminderSent?: string;
  nextRequiredAction: string;
}

export interface MaturityRegisterResponse {
  summary: {
    total_monitored: number;
    approaching_maturity_count: number;
    past_maturity_count: number;
    active_long_term_count: number;
    evaluation_date: string;
  };
  approaching_maturity: MaturityItem[];
  past_maturity: MaturityItem[];
  active_long_term: MaturityItem[];
  all_monitored: MaturityItem[];
}

export interface DeadlineCheckResult {
  status: string;
  checked_instruments: number;
  new_notifications_created: number;
  skipped_duplicates: number;
  maturing_soon_count: number;
  matured_count: number;
  executed_at: string;
}

export const monitoringService = {
  getMaturityRegister: (institutionId?: string) =>
    apiClient.get<ApiResponse<MaturityRegisterResponse>>("/monitoring/maturity-register", {
      params: { institution_id: institutionId },
    }),

  runDeadlineChecks: () =>
    apiClient.post<ApiResponse<DeadlineCheckResult>>("/monitoring/run-deadline-checks"),

  sendManualReminder: (instrumentId: string) =>
    apiClient.post<ApiResponse<{ message: string }>>(`/monitoring/send-reminder/${instrumentId}`),
};

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

// ─── Release & Refund Requests Service ────────────────────────────────
export interface ReleaseRequestCreatePayload {
  fdr_id: string;
  fdr_number: string;
  institution_id: string;
  institution_name: string;
  bank_name: string;
  principal_amount: number;
  request_type: "FULL_RELEASE" | "PARTIAL_REFUND" | "NOC_ISSUANCE";
  justification_reason: string;
  regulatory_clause_reference: string;
  supporting_document_names: string[];
  applicant_name: string;
  applicant_designation: string;
}

export interface ReleaseDecisionPayload {
  officer_id: string;
  officer_name: string;
  officer_role: string;
  decision: "RECOMMENDED_FOR_APPROVAL" | "APPROVED" | "REJECTED" | "RETURNED_FOR_QUERY" | "COMPLETED";
  decision_reason: string;
}

export const releaseService = {
  getAll: (institutionId?: string) =>
    apiClient.get<{ total: number; requests: any[] }>("/releases", {
      params: institutionId ? { institution_id: institutionId } : undefined,
    }),

  getById: (releaseId: string) =>
    apiClient.get<any>(`/releases/${releaseId}`),

  create: (payload: ReleaseRequestCreatePayload) =>
    apiClient.post<{ status: string; message: string; release_request: any }>("/releases", payload),

  recordDecision: (releaseId: string, payload: ReleaseDecisionPayload) =>
    apiClient.post<{ status: string; message: string; request: any }>(`/releases/${releaseId}/decision`, payload),
};

// ─── Renewals & Rollover Service ──────────────────────────────────────
export interface RenewalSubmissionPayload {
  predecessor_fdr_id: string;
  predecessor_fdr_number: string;
  institution_id: string;
  institution_name: string;
  replacement_fdr_number: string;
  bank_name: string;
  bank_branch: string;
  ifsc_code: string;
  principal_amount: number;
  interest_rate: number;
  new_issue_date: string;
  new_maturity_date: string;
  tenure_months: number;
  supporting_document_name: string;
  applicant_name: string;
  applicant_email: string;
  justification: string;
}

export interface RenewalReviewPayload {
  officer_id: string;
  officer_name: string;
  officer_role: string;
  decision: "APPROVED" | "REJECTED" | "MORE_INFO_REQUIRED";
  remarks: string;
}

export const renewalService = {
  getAll: (institutionId?: string) =>
    apiClient.get<{ total: number; renewals: any[] }>("/renewals", {
      params: institutionId ? { institution_id: institutionId } : undefined,
    }),

  submit: (payload: RenewalSubmissionPayload) =>
    apiClient.post<{ status: string; message: string; renewal_request: any }>("/renewals", payload),

  review: (renewalId: string, payload: RenewalReviewPayload) =>
    apiClient.post<{ status: string; message: string; renewal: any }>(`/renewals/${renewalId}/review`, payload),
};

// ─── Two-Stage Verification Service ────────────────────────────────────
export interface TechnicalScrutinyPayload {
  instrument_id: string;
  outcome: "VERIFIED" | "DISCREPANCY_FOUND" | "CLARIFICATION_REQUIRED" | "UNABLE_TO_VERIFY";
  officer_notes?: string;
  clarification_query?: string;
  discrepancies?: Array<{
    field_name: string;
    submitted_value: string;
    extracted_value: string;
    severity?: string;
    description?: string;
  }>;
  field_concordance?: Record<string, { submitted: any; extracted: any; match: boolean }>;
  lien_beneficiary_verified?: boolean;
  sfms_reference?: string;
  duplicate_check_passed?: boolean;
}

export interface ExecutiveDecisionPayload {
  instrument_id: string;
  decision: "APPROVE" | "REJECT" | "RETURN_FOR_VERIFICATION" | "REQUEST_CLARIFICATION";
  sanction_notes?: string;
  decision_notes?: string;
  exception_permitted?: boolean;
  exception_reason?: string;
}

export interface VerificationMethodSummary {
  method: string;
  status: "VERIFIED" | "DISCREPANCY_FOUND" | "PENDING" | "UNABLE_TO_VERIFY" | "NOT_AVAILABLE" | "REQUIRES_MANUAL_REVIEW" | "SERVICE_UNAVAILABLE" | "INVALID_REFERENCE" | "PENDING_CONSENT" | "CONSENT_EXPIRED" | "FIELD_MISMATCH" | "FIP_UNSUPPORTED";
  source_of_evidence: string;
  evidence_date?: string | null;
  evidence_reference?: string | null;
  findings: string;
  outstanding_issues?: string | null;
  reviewer_notes: string;
  data_source?: string;
}

export interface FundAllocationDecision {
  required_amount: number;
  observed_amount?: number | null;
  observed_amount_display: string;
  source_of_observed: string;
  reporting_period: string;
  difference?: number | null;
  compliance_status: "COMPLIANT" | "DEFICIT" | "UNABLE_TO_VERIFY";
  balance_details: string;
  outstanding_issues?: string | null;
}

export interface MandatoryCheckItem {
  name: string;
  passed: boolean;
}

export interface FinancialSummaryResponse {
  instrument_id: string;
  fdr_number: string;
  institution_name: string;
  institution_code?: string;
  bank_name: string;
  principal_amount: number;
  deposit_date: string;
  maturity_date: string;
  submission_status: string;
  verification_status: string;
  financial_verification_status: string;
  has_duplicate_reference: boolean;
  allocation_decision?: FundAllocationDecision;
  methods: VerificationMethodSummary[];
  mandatory_checks: MandatoryCheckItem[];
  mandatory_checks_passed: boolean;
  unresolved_discrepancies_count: number;
  history: Array<{
    id: string;
    stage: string;
    method: string;
    outcome: string;
    reviewer_id: string;
    reviewed_at: string;
    notes?: string;
    exception_permitted?: boolean;
    exception_reason?: string;
  }>;
  // Optional convenience aliases
  instrument?: any;
  technical_scrutiny?: any;
}

export const verificationService = {
  checkDuplicate: (referenceNumber: string, excludeId?: string) =>
    apiClient.get<{
      is_duplicate: boolean;
      reference_number: string;
      conflict_count: number;
      conflicts: Array<{ id: string; reference_number: string; institution_id: string; institution_name: string; status: string }>;
      message: string;
    }>(`/verification/check-duplicate/${encodeURIComponent(referenceNumber)}`, {
      params: excludeId ? { exclude_id: excludeId } : undefined,
    }),

  submitTechnicalScrutiny: (payload: TechnicalScrutinyPayload) =>
    apiClient.post<{ status: string; message: string; instrument_id: string; verification_id: string }>(
      "/verification/technical-scrutiny",
      payload
    ),

  getFinancialSummary: (instrumentId: string) =>
    apiClient.get<FinancialSummaryResponse>(`/verification/financial-summary/${instrumentId}`),

  submitExecutiveDecision: (payload: ExecutiveDecisionPayload) =>
    apiClient.post<{ status: string; message: string; instrument_id: string; financial_verification_status: string }>(
      "/verification/executive-decision",
      payload
    ),

  getScrutinyQueue: () =>
    apiClient.get<{ total: number; cases: any[] }>("/scrutiny/queue"),
};




// ─── Weekly Bank Statement Analyzer Service ────────────────────────────
export interface BankStatementItem {
  id: string;
  institution_id: string;
  institution_name: string;
  bank_name: string;
  account_number: string;
  reference_number?: string;
  statement_source: string;
  reporting_period_start: string;
  reporting_period_end: string;
  submission_date: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  status: "uploaded" | "processing" | "extracted" | "reconciled" | "discrepancy_flagged" | "requires_review" | "failed" | "rejected";
  opening_balance?: number;
  closing_balance?: number;
  reconciliation_passed?: boolean;
  discrepancies_count: number;
  reviewer_decision?: string;
  reviewer_notes?: string;
  extraction?: {
    account_holder_name?: string;
    bank_name?: string;
    account_number?: string;
    opening_balance?: number;
    closing_balance?: number;
    total_credits: number;
    total_debits: number;
    transaction_count: number;
    missing_fields: string[];
    confidence_score: number;
  };
  analysis?: {
    id: string;
    opening_balance: number;
    closing_balance: number;
    net_change: number;
    net_change_percentage: number;
    reconciliation_passed: boolean;
    reconciliation_variance: number;
    required_minimum_balance: number;
    balance_meets_requirement: boolean;
    unexplained_withdrawals_detected: boolean;
    unexplained_withdrawals_count: number;
    unexplained_withdrawals_total: number;
    period_continuity_status: string;
    status: string;
    discrepancies: Array<{
      field_name: string;
      category: string;
      expected_value?: string;
      observed_value?: string;
      severity: string;
      explanation: string;
    }>;
    reviewer_decision?: string;
    reviewer_notes?: string;
    reviewed_at?: string;
  };
  transactions?: Array<{
    id: string;
    date: string;
    description: string;
    reference_number?: string;
    credit_amount: number;
    debit_amount: number;
    running_balance?: number;
    transaction_type: string;
    is_suspicious: boolean;
    flag_reason?: string;
  }>;
}

export interface StatementDetailResponse {
  id: string;
  institution_id: string;
  institution_name: string;
  bank_name: string;
  account_number: string;
  reference_number?: string;
  statement_source: string;
  reporting_period_start: string;
  reporting_period_end: string;
  submission_date: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  status: string;
  extraction?: {
    account_holder_name?: string;
    bank_name?: string;
    account_number?: string;
    opening_balance?: number;
    closing_balance?: number;
    total_credits: number;
    total_debits: number;
    transaction_count: number;
    missing_fields: string[];
    confidence_score: number;
  };
  analysis?: {
    id: string;
    opening_balance: number;
    closing_balance: number;
    net_change: number;
    net_change_percentage: number;
    reconciliation_passed: boolean;
    reconciliation_variance: number;
    required_minimum_balance: number;
    balance_meets_requirement: boolean;
    unexplained_withdrawals_detected: boolean;
    unexplained_withdrawals_count: number;
    unexplained_withdrawals_total: number;
    period_continuity_status: string;
    status: string;
    discrepancies: Array<{
      field_name: string;
      category: string;
      expected_value?: string;
      observed_value?: string;
      severity: string;
      explanation: string;
    }>;
    reviewer_decision?: string;
    reviewer_notes?: string;
    reviewed_at?: string;
  };
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    reference_number?: string;
    credit_amount: number;
    debit_amount: number;
    running_balance?: number;
    transaction_type: string;
    is_suspicious: boolean;
    flag_reason?: string;
  }>;
}

export interface FinancialAlertItem {
  id: string;
  institution_id: string;
  institution_name: string;
  statement_id?: string;
  alert_type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export const statementService = {
  upload: (formData: FormData) =>
    apiClient.post<{ success: boolean; message: string; data: any }>("/statements/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  list: (params?: { institution_id?: string; status?: string; page?: number; page_size?: number }) =>
    apiClient.get<{ success: boolean; data: BankStatementItem[]; total: number; page: number; page_size: number }>("/statements", {
      params,
    }),

  getById: (statementId: string) =>
    apiClient.get<{ success: boolean; data: StatementDetailResponse }>(`/statements/${statementId}`),

  getTrend: (institutionId: string) =>
    apiClient.get<{ success: boolean; data: { institution_id: string; data_points: number; history: any[] } }>(
      `/statements/institution/${institutionId}/trend`
    ),

  recordReview: (statementId: string, payload: { decision: string; notes: string }) =>
    apiClient.post<{ success: boolean; message: string; data: any }>(`/statements/${statementId}/review`, payload),

  listAlerts: (params?: { institution_id?: string; status?: string; severity?: string }) =>
    apiClient.get<{ success: boolean; total: number; data: FinancialAlertItem[] }>("/statements/alerts", {
      params,
    }),

  resolveAlert: (alertId: string, payload: { status: string; resolution_notes: string }) =>
    apiClient.patch<{ success: boolean; message: string; data: any }>(`/statements/alerts/${alertId}/resolve`, payload),
};


// ─── Account Aggregator (AA) Service ────────────────────────────────────
export interface AAConsentItem {
  id: string;
  institution_id: string;
  fip_id: string;
  fip_name: string;
  customer_aa_handle: string;
  consent_handle: string;
  consent_id?: string;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED" | "EXPIRED";
  consent_mode: string;
  data_categories: string[];
  purpose_description: string;
  consent_start_date: string;
  consent_expiry_date: string;
  redirect_url?: string;
  authorized_at?: string;
  created_at: string;
}

export interface AATelemetryResponse {
  id: string;
  consent_id: string;
  instrument_id?: string;
  institution_id: string;
  fip_name: string;
  data_source: "live_aa" | "demonstration" | "unavailable";
  status: "verified" | "field_mismatch" | "pending_consent" | "consent_expired" | "fip_unsupported" | "service_unavailable";
  concordance_matched: boolean;
  retrieved_data?: {
    reference_number?: string;
    account_number_masked?: string;
    fip_id: string;
    fip_name: string;
    account_holder_name?: string;
    principal_amount: number;
    currency: string;
    interest_rate?: number;
    maturity_amount?: number;
    open_date?: string;
    maturity_date?: string;
    tenure_days?: number;
    deposit_status: string;
    lien_marked?: boolean;
    lien_type?: string;
    lien_beneficiary?: string;
    encumbrance_status?: string;
  };
  mismatches?: Array<{
    field_name: string;
    submitted_value?: string;
    fip_value?: string;
    severity: string;
    explanation: string;
  }>;
  unsupported_fields?: string[];
  raw_signature_info?: {
    algorithm?: string;
    verified?: boolean;
    certSerial?: string;
    payloadDigest?: string;
  };
  demo_notice?: string;
  retrieved_at: string;
}

export const accountAggregatorService = {  listConsents: (params?: { institution_id?: string; status?: string }) =>
    apiClient.get<AAConsentItem[]>("/account-aggregator/consents", { params }),

  initiateConsent: (payload: {
    institution_id: string;
    institution_name: string;
    customer_aa_handle: string;
    fip_id: string;
    fip_name: string;
    data_categories?: string[];
    consent_validity_months?: number;
  }) =>
    apiClient.post<AAConsentItem>("/account-aggregator/consents", payload),

  getConsentStatus: (consentId: string) =>
    apiClient.get<AAConsentItem>(`/account-aggregator/consents/${consentId}/status`),

  revokeConsent: (consentId: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/account-aggregator/consents/${consentId}/revoke`),

  fetchTelemetry: (instrumentId: string, forceRefresh: boolean = false) =>
    apiClient.post<AATelemetryResponse>(`/account-aggregator/telemetry/${instrumentId}`, null, {
      params: { force_refresh: forceRefresh },
    }),

  getEvidenceByInstrument: (instrumentId: string) =>
    apiClient.get<AATelemetryResponse | null>(`/account-aggregator/instrument/${instrumentId}/evidence`),
};


// ─── Institution Dashboard Service ──────────────────────────────────────────
export interface InstitutionFinancialStatus {
  institution_id: string;
  institution_name: string;
  institution_code: string;
  generated_at: string;
  fdr_portfolio: {
    total: number;
    verified: number;
    under_review: number;
    pending: number;
    clarification_required: number;
    rejected: number;
    instruments: Array<{
      id: string;
      reference_number: string;
      instrument_type: string;
      bank_name: string;
      branch_name?: string;
      amount: number;
      submission_status: string;
      verification_status: string;
      financial_verification_status: string;
      lifecycle_status: string;
      maturity_date?: string;
      days_to_maturity?: number;
      is_maturing_soon: boolean;
    }>;
  };
  statements: {
    submitted_count: number;
    missing_periods: Array<{ period_start: string; period_end: string; label: string }>;
    missing_count: number;
    recent: Array<{
      id: string;
      bank_name: string;
      account_number: string;
      period_start?: string;
      period_end?: string;
      submission_date?: string;
      status: string;
      original_filename: string;
      reconciliation_passed?: boolean;
      discrepancies_count: number;
      reviewer_decision?: string;
      reviewer_notes?: string;
      has_reviewer_query: boolean;
      balance_meets_requirement?: boolean;
    }>;
    statements_with_queries: Array<{
      id: string;
      period_start?: string;
      period_end?: string;
      reviewer_notes?: string;
      has_reviewer_query: boolean;
    }>;
  };
  financial_discrepancies: {
    total_open: number;
    open_alerts: Array<{
      id: string;
      alert_type: string;
      severity: string;
      title: string;
      description: string;
      status: string;
      created_at?: string;
    }>;
    clarification_requests: Array<{
      fdr_id: string;
      fdr_number: string;
      status: string;
      financial_status: string;
      notes?: string;
      issued_at?: string;
    }>;
  };
  upcoming_maturities: Array<{
    fdr_id: string;
    reference_number: string;
    bank_name: string;
    amount: number;
    maturity_date?: string;
    days_to_maturity?: number;
    is_critical: boolean;
  }>;
  refund_requests: {
    total: number;
    pending: number;
    approved_pending_discharge: number;
    completed: number;
    requests: Array<{
      id: string;
      instrument_id: string;
      fdr_number: string;
      bank_name: string;
      amount: number;
      request_type: string;
      status: string;
      submitted_at: string;
      reason: string;
      regulatory_clause?: string;
      latest_decision?: string;
      latest_decision_notes?: string;
      latest_decision_at?: string;
      has_pending_query: boolean;
      noc_voucher_ref?: string;
    }>;
  };
  notifications: Array<{
    type: string;
    severity: "CRITICAL" | "WARNING" | "INFO";
    title: string;
    body: string;
    action_required: boolean;
    fdr_id?: string;
    statement_id?: string;
    request_id?: string;
  }>;
}

export const institutionDashboardService = {
  getFinancialStatus: (institutionId?: string) =>
    apiClient.get<InstitutionFinancialStatus>("/institution-dashboard/financial-status", {
      params: institutionId ? { institution_id: institutionId } : undefined,
    }),
};

-- ─────────────────────────────────────────────────────────────────
-- Garuda Netra — Database Schema
-- SIH 2026 | Problem ID: SIH26265
-- ─────────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'officer'
                  CHECK (role IN ('admin', 'officer', 'verifier', 'depositor')),
  department    VARCHAR(255),
  designation   VARCHAR(255),
  status        VARCHAR(50) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Fixed Deposit Receipts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS fdrs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fdr_number       VARCHAR(50) UNIQUE NOT NULL,
  depositor_name   VARCHAR(255) NOT NULL,
  depositor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  bank_name        VARCHAR(255) NOT NULL,
  bank_branch      VARCHAR(255) NOT NULL,
  account_number   VARCHAR(100) NOT NULL,
  ifsc_code        VARCHAR(20) NOT NULL,
  principal_amount NUMERIC(15, 2) NOT NULL,
  interest_rate    NUMERIC(5, 2) NOT NULL,
  maturity_amount  NUMERIC(15, 2) NOT NULL,
  deposit_date     DATE NOT NULL,
  maturity_date    DATE NOT NULL,
  tenure_months    INTEGER NOT NULL,
  purpose          VARCHAR(100) NOT NULL DEFAULT 'security_deposit'
                     CHECK (purpose IN ('security_deposit', 'earnest_money', 'performance_guarantee', 'bid_security', 'advance_payment_guarantee', 'other')),
  contract_number  VARCHAR(100),
  project_name     VARCHAR(255),
  department       VARCHAR(255) NOT NULL,
  status           VARCHAR(50) NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'submitted', 'under_review', 'verified', 'active', 'matured', 'renewal_pending', 'renewal_approved', 'release_pending', 'release_approved', 'released', 'rejected', 'cancelled')),
  submitted_by     UUID REFERENCES users(id),
  verified_by      UUID REFERENCES users(id),
  approved_by      UUID REFERENCES users(id),
  remarks          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FDR Documents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fdr_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fdr_id        UUID NOT NULL REFERENCES fdrs(id) ON DELETE CASCADE,
  file_name     VARCHAR(255) NOT NULL,
  file_type     VARCHAR(100) NOT NULL,
  file_size     INTEGER NOT NULL,
  file_url      TEXT NOT NULL,
  document_type VARCHAR(50) NOT NULL DEFAULT 'other'
                  CHECK (document_type IN ('fdr_certificate', 'bank_letter', 'contract', 'identity_proof', 'other')),
  uploaded_by   UUID REFERENCES users(id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FDR History / Audit Trail ────────────────────────────────────
CREATE TABLE IF NOT EXISTS fdr_history (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fdr_id           UUID NOT NULL REFERENCES fdrs(id) ON DELETE CASCADE,
  action           VARCHAR(100) NOT NULL,
  from_status      VARCHAR(50),
  to_status        VARCHAR(50),
  performed_by     UUID REFERENCES users(id),
  performed_by_name VARCHAR(255),
  remarks          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Security Deposits ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_deposits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_number  VARCHAR(50) UNIQUE NOT NULL,
  contractor_name VARCHAR(255) NOT NULL,
  contractor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  contract_number VARCHAR(100) NOT NULL,
  project_name    VARCHAR(255) NOT NULL,
  department      VARCHAR(255) NOT NULL,
  deposit_amount  NUMERIC(15, 2) NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'maturity_due', 'renewal_requested', 'renewal_approved', 'release_requested', 'release_approved', 'released', 'replaced', 'forfeited')),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  remarks         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Security Deposit ↔ FDR (many-to-many) ───────────────────────
CREATE TABLE IF NOT EXISTS security_deposit_fdrs (
  security_deposit_id UUID REFERENCES security_deposits(id) ON DELETE CASCADE,
  fdr_id              UUID REFERENCES fdrs(id) ON DELETE CASCADE,
  PRIMARY KEY (security_deposit_id, fdr_id)
);

-- ─── Workflow Requests ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number  VARCHAR(50) UNIQUE NOT NULL,
  request_type    VARCHAR(50) NOT NULL
                    CHECK (request_type IN ('submission', 'renewal', 'replacement', 'release')),
  fdr_id          UUID NOT NULL REFERENCES fdrs(id) ON DELETE CASCADE,
  requested_by    UUID REFERENCES users(id),
  requested_by_name VARCHAR(255),
  assigned_to     UUID REFERENCES users(id),
  status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason          TEXT NOT NULL,
  remarks         TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               VARCHAR(255) NOT NULL,
  message             TEXT NOT NULL,
  type                VARCHAR(50) NOT NULL DEFAULT 'info'
                        CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_read             BOOLEAN NOT NULL DEFAULT false,
  related_entity_id   UUID,
  related_entity_type VARCHAR(50),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fdrs_status ON fdrs(status);
CREATE INDEX IF NOT EXISTS idx_fdrs_maturity_date ON fdrs(maturity_date);
CREATE INDEX IF NOT EXISTS idx_fdrs_depositor_id ON fdrs(depositor_id);
CREATE INDEX IF NOT EXISTS idx_fdrs_department ON fdrs(department);
CREATE INDEX IF NOT EXISTS idx_fdr_documents_fdr_id ON fdr_documents(fdr_id);
CREATE INDEX IF NOT EXISTS idx_fdr_history_fdr_id ON fdr_history(fdr_id);
CREATE INDEX IF NOT EXISTS idx_workflow_requests_status ON workflow_requests(status);
CREATE INDEX IF NOT EXISTS idx_workflow_requests_fdr_id ON workflow_requests(fdr_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ─── Auto-update updated_at trigger ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_fdrs_updated_at BEFORE UPDATE ON fdrs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_security_deposits_updated_at BEFORE UPDATE ON security_deposits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_workflow_requests_updated_at BEFORE UPDATE ON workflow_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

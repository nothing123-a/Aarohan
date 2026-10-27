# AGENTS.md

# FDR-SMART — Coding Agent Development Rules

## 1. Purpose

This document defines the mandatory rules for AI coding agents and developers working on FDR-SMART.

FDR-SMART is a centralized portal for managing institution-wise and instrument-wise security deposits and Fixed Deposit Receipts (FDRs) for the AICTE Regulation Bureau.

The application supports institution management, financial instrument registration, document uploads, OCR-assisted extraction, human verification, discrepancy resolution, maturity monitoring, renewal and replacement workflows, release/refund requests, notifications, reporting, and audit trails.

Every coding agent must follow these rules throughout development, debugging, testing, refactoring, and maintenance.

## 2. Source of Truth and Precedence

The following documents define the project requirements and technical decisions:

1. `PRD.md` — Product requirements, user journeys, business rules, scope, and acceptance criteria.
2. `DESIGN.md` — Visual design, UI behavior, components, accessibility, and interaction patterns.
3. `ARCHITECTURE.md` — Application architecture, technology stack, module boundaries, and deployment approach.
4. `DATABASE.md` — Data model, relationships, constraints, indexes, authorization boundaries, and data retention.
5. `API.md` — API contracts, authentication, authorization, validation, integrations, and failure handling.
6. `AGENTS.md` — Development rules and coding-agent operating procedures.

### 2.1 Mandatory rules

* Read the relevant project documents before implementing a feature.
* Treat the documents as the primary specification, not optional guidance.
* Follow the existing implementation when it is consistent with the project documents.
* Do not silently change approved requirements, architectural decisions, database semantics, API contracts, or design rules.
* If documents conflict, identify the conflict and follow the precedence above provisionally. Do not make consequential product, security, or data-model decisions without clarification when the conflict cannot be resolved safely.
* Treat security, privacy, data integrity, and authorization requirements as mandatory constraints.
* Do not invent product requirements merely because they are convenient to implement.
* Record approved changes in the appropriate project document.

If a requested change conflicts with a project requirement, explain the conflict and propose the smallest compliant solution before proceeding.

---

# 3. Inspect Before Changing

**Never modify a codebase before understanding the relevant existing implementation.**

Before making changes:

1. Inspect the repository structure.
2. Read `AGENTS.md` and any more specific agent instructions that apply to the target directory.
3. Read the relevant project documents.
4. Locate the files, modules, components, routes, models, services, and tests involved.
5. Inspect existing implementations and nearby examples.
6. Identify dependencies, interfaces, and downstream consumers.
7. Check the current Git working tree and avoid overwriting unrelated user changes.
8. Determine the smallest change that satisfies the requirement.

Use repository search, targeted file inspection, and existing tests to understand the code before editing.

### 3.1 Do not assume

Never assume:

* A file or module exists because it appears in the proposed architecture.
* A dependency is installed because it is mentioned in a document.
* A database schema matches the latest design document.
* An endpoint has the behavior implied by its name.
* A component can be replaced without checking its consumers.
* A test is obsolete without investigating why it exists.
* An external service is available merely because an integration is described.

Verify the actual repository state before deciding how to implement a change.

### 3.2 Existing code takes precedence over hypothetical code

* Extend existing modules and patterns where appropriate.
* Do not regenerate the project structure unnecessarily.
* Do not replace working implementations merely to match a preferred personal style.
* If the codebase differs from the documented architecture, identify the discrepancy and determine whether the implementation or documentation should change.
* Avoid broad rewrites when a focused change is sufficient.

---

# 4. Code Quality and Naming

Write code that is readable, maintainable, testable, and consistent with the existing codebase.

## 4.1 General rules

* Prefer simple, explicit implementations over clever abstractions.
* Follow the established formatting and naming conventions.
* Keep functions focused on one clear responsibility.
* Avoid duplicated business logic.
* Avoid deeply nested conditionals when simpler control flow is possible.
* Use meaningful names that express business intent.
* Replace unexplained literals with named constants when they represent business rules or configuration.
* Remove dead code only when its removal is within the scope of the change.
* Do not leave placeholder implementations, fake success responses, or misleading TODOs in completed features.
* Do not suppress errors merely to make a workflow appear successful.
* Avoid comments that repeat what the code already says.
* Document non-obvious decisions, constraints, and security-sensitive behavior.

## 4.2 Naming conventions

Follow these conventions unless the existing framework or codebase establishes a consistent alternative.

| Item                               | Convention                    | Example                 |
| ---------------------------------- | ----------------------------- | ----------------------- |
| Python modules                     | `snake_case`                  | `instrument_service.py` |
| Python functions                   | `snake_case`                  | `submit_instrument()`   |
| Python variables                   | `snake_case`                  | `maturity_date`         |
| Python classes                     | `PascalCase`                  | `InstrumentService`     |
| Python constants                   | `UPPER_SNAKE_CASE`            | `MAX_UPLOAD_SIZE_BYTES` |
| React components                   | `PascalCase`                  | `InstrumentDetails.tsx` |
| React hooks                        | `camelCase` with `use` prefix | `useInstrumentDetails`  |
| TypeScript functions and variables | `camelCase`                   | `fetchInstrument()`     |
| TypeScript types and interfaces    | `PascalCase`                  | `InstrumentResponse`    |
| Database tables and columns        | `snake_case`                  | `financial_instruments` |
| API paths                          | Lowercase, resource-oriented  | `/api/v1/instruments`   |
| Test files                         | Follow framework conventions  | `test_instruments.py`   |

Naming must communicate domain meaning. Do not use vague identifiers such as `data`, `item`, `result`, or `handler` when a more precise name is practical.

## 4.3 Business terminology

Use the terminology established in the project documents.

Keep these concepts distinct:

* Submission status.
* Verification status.
* Instrument lifecycle status.
* Document security-scan status.
* Document extraction status.
* Release/refund request status.
* Release/refund decision.
* Actual financial release or refund completion.

Never collapse distinct business concepts into one generic status field.

---

# 5. Project Structure and Module Boundaries

Follow the architecture documented in `ARCHITECTURE.md`.

The recommended architecture is a modular monolith with a React/TypeScript frontend, FastAPI backend, PostgreSQL database, private document storage, and background processing where needed.

Use the repository's existing structure if it already implements these boundaries correctly.

## 5.1 Frontend structure

The expected feature-oriented structure is approximately:

* `frontend/src/app/` — Application setup, routing, and shared providers.
* `frontend/src/components/` — Reusable UI components.
* `frontend/src/features/` — Feature-specific pages, components, hooks, and logic.
* `frontend/src/hooks/` — Shared hooks.
* `frontend/src/lib/api/` — API client and shared request configuration.
* `frontend/src/validation/` — Shared validation schemas where appropriate.
* `frontend/src/formatting/` — Reusable formatting utilities.
* `frontend/src/styles/` — Global styles and design tokens.
* `frontend/src/types/` — Shared types that genuinely need a central location.

Feature-specific logic should remain inside its feature unless it is reused meaningfully elsewhere.

Do not create new folders merely to match this outline if the existing project already uses an equally clear structure.

## 5.2 Backend structure

The expected backend structure is approximately:

* `backend/app/main.py` — Application initialization.
* `backend/app/core/` — Configuration, security, permissions, logging, and error handling.
* `backend/app/api/` — API routing and request/response integration.
* `backend/app/modules/auth/` — Authentication integration and application identity resolution.
* `backend/app/modules/institutions/` — Institution and membership logic.
* `backend/app/modules/instruments/` — Financial instrument operations.
* `backend/app/modules/documents/` — Document metadata and storage integration.
* `backend/app/modules/document_processing/` — Extraction orchestration.
* `backend/app/modules/verification/` — Review and discrepancy workflows.
* `backend/app/modules/monitoring/` — Maturity and lifecycle monitoring.
* `backend/app/modules/requests/` — Release/refund requests and decisions.
* `backend/app/modules/notifications/` — Notification behavior.
* `backend/app/modules/reports/` — Authorized reporting.
* `backend/app/modules/audit/` — Audit recording and retrieval.
* `backend/app/infrastructure/` — Database, storage, email, and background-job integrations.
* `backend/app/workers/` — Background workers, where required.
* `backend/migrations/` — Database migrations.
* `backend/tests/` — Backend tests.

Do not force every module to contain the same files. Introduce a service, repository, schema, or adapter only when the responsibility requires it.

## 5.3 Separation of concerns

Keep responsibilities clear:

* API routes handle HTTP concerns and coordinate application operations.
* Request/response schemas validate external data.
* Services implement business workflows.
* Database models represent persistence.
* Infrastructure adapters handle external dependencies.
* Authorization logic remains explicit and consistently enforced.
* UI components render and coordinate interaction without becoming repositories of business rules.

Avoid putting database queries, workflow transitions, file storage, and external HTTP calls into a single oversized route handler.

Do not introduce extra abstraction layers without a concrete benefit.

---

# 6. Component Reuse and UI Consistency

Follow `DESIGN.md` for all frontend changes.

## 6.1 Reuse before creating

Before building a UI component:

1. Search for an existing component with the same responsibility.
2. Check whether it supports the required states and interactions.
3. Reuse or extend it if appropriate.
4. Create a new component only when existing components cannot meet the requirement cleanly.

Do not create near-duplicate buttons, dialogs, tables, form controls, status badges, or notification components.

## 6.2 Design system

Maintain the established visual direction:

* Professional, restrained government-administration interface.
* Clear information hierarchy.
* Consistent spacing and typography.
* Consistent status indicators.
* Explicit feedback and next actions.
* Minimal decoration.
* Accessible focus states.
* Responsive layouts.
* Clear loading, empty, success, and error states.

Use the design tokens and component patterns defined in `DESIGN.md`.

Do not introduce unrelated colors, fonts, shadows, animations, or layout conventions without a design requirement.

## 6.3 Status presentation

Status labels must communicate the actual business state.

* Do not represent an OCR result as an independent verification.
* Do not show a matured instrument as automatically noncompliant.
* Do not show a release/refund request as completed merely because it was approved.
* Do not rely on color alone to communicate status.
* Use clear labels, supporting text, and accessible visual indicators.

## 6.4 Accessibility

* Use semantic HTML.
* Ensure keyboard accessibility.
* Provide visible focus indicators.
* Associate form fields with labels.
* Make validation errors available to assistive technology.
* Use accessible names for icon-only controls.
* Maintain appropriate color contrast.
* Avoid interaction patterns that depend exclusively on hover.
* Respect reduced-motion preferences.
* Follow the accessibility target documented in `DESIGN.md`.

---

# 7. Dependency Management

Dependencies must be justified, minimal, and compatible with the documented architecture.

## 7.1 Before adding a dependency

1. Search the repository for existing functionality that solves the problem.
2. Check whether an installed framework already provides the capability.
3. Confirm compatibility with the current runtime and package versions.
4. Assess maintenance status, security implications, licensing, and deployment impact.
5. Explain why the dependency is necessary.
6. Add it only to the appropriate package manifest and lockfile.

## 7.2 Prohibited dependency practices

* Do not install a library merely because it is popular.
* Do not add multiple libraries for the same purpose.
* Do not replace an existing framework without a concrete technical reason.
* Do not introduce a new database, queue, cache, or service architecture for convenience.
* Do not use an LLM to replace straightforward deterministic validation.
* Do not add blockchain, vector databases, event-sourcing infrastructure, or microservices without an approved requirement.
* Do not bypass the lockfile or use unpinned production dependencies where reproducibility requires locking.
* Do not upgrade unrelated dependencies as part of a feature change.

## 7.3 Approved technology direction

Follow `ARCHITECTURE.md` for the current technology choices, including:

* React and TypeScript.
* Vite.
* Tailwind CSS.
* React Router.
* TanStack Query.
* React Hook Form and Zod where appropriate.
* FastAPI and Pydantic.
* SQLAlchemy 2.x.
* PostgreSQL.
* Alembic.
* Private object storage.
* Pytest and HTTPX.
* Vitest and React Testing Library.

Use Tesseract, PyMuPDF, Celery, Redis, or other optional tools only as justified by the actual implementation and approved requirements.

Do not introduce optional infrastructure simply because it appears in an architecture document as a possible future choice.

---

# 8. Type Safety and Validation

Type safety is mandatory at application boundaries.

## 8.1 TypeScript rules

* Avoid `any`; use explicit types, `unknown`, generics, or discriminated unions where appropriate.
* Type API requests and responses.
* Model status values as explicit unions or equivalent constrained types.
* Avoid unsafe type assertions that bypass validation.
* Handle nullable and optional fields deliberately.
* Avoid non-null assertions when a proper runtime check is possible.
* Keep frontend types aligned with the API contract.
* Do not duplicate server-side security validation in the frontend as a substitute for backend checks.

## 8.2 Python rules

* Use type annotations for public functions and service boundaries.
* Use Pydantic schemas for API request and response validation.
* Avoid unnecessary `Any`.
* Validate untrusted input at system boundaries.
* Prefer explicit domain types and clear return values.
* Avoid broad exception handling that hides errors.
* Keep ORM models, API schemas, and business logic distinct when their responsibilities differ.

## 8.3 Validation rules

Validate all untrusted input, including:

* UUIDs and identifiers.
* Financial amounts and currency codes.
* Issue dates and maturity dates.
* Workflow states and transitions.
* File types, file sizes, and upload contents.
* Search fields, sorting parameters, and pagination.
* External API responses and webhook payloads.
* Free-text input where limits or sanitization are required.

Use database constraints in addition to application validation for persistent invariants.

Never assume that frontend validation makes backend validation unnecessary.

---

# 9. Error Handling and Failure Recovery

Errors must be handled explicitly and consistently.

## 9.1 General rules

* Use the standard error contract defined in `API.md`.
* Return stable machine-readable error codes.
* Provide safe, useful user-facing messages.
* Use field-level validation details when appropriate.
* Include correlation identifiers for troubleshooting.
* Log unexpected failures with sufficient diagnostic context.
* Never expose stack traces, SQL statements, secrets, or internal storage paths to clients.
* Do not catch an exception and return a successful response.
* Do not silently discard failed operations.

## 9.2 Exception handling

* Catch specific exceptions where possible.
* Use broad exception handlers only at deliberate application boundaries.
* Preserve the original cause when re-raising an exception.
* Translate internal exceptions into safe API errors.
* Avoid duplicate logging at every layer.
* Do not log sensitive request bodies.

## 9.3 External dependency failures

Treat PostgreSQL, object storage, OCR, email, and approved external verification systems as dependencies that may fail.

* Set explicit timeouts for external operations.
* Retry only operations that are safe to retry.
* Use bounded retries and backoff where appropriate.
* Make repeated operations idempotent where duplicate effects would be harmful.
* Preserve durable workflow state when asynchronous processing fails.
* Avoid making an unrelated business operation fail solely because optional email delivery failed.
* Do not interpret unavailable external verification as a negative verification result.
* Reconcile partial failures between PostgreSQL and object storage.

Do not add retry frameworks, circuit breakers, or distributed orchestration systems unless the requirements and failure modes justify them.

---

# 10. Security and Secrets

Security requirements apply to every feature, not only authentication-related work.

## 10.1 Secrets management

Never:

* Commit credentials, tokens, API keys, private keys, or production connection strings.
* Hard-code secrets in frontend or backend source files.
* Expose server-side secrets through `VITE_*` variables.
* Return secrets in API responses.
* Log authentication tokens or storage credentials.
* Include secrets in screenshots, test fixtures, sample requests, or documentation.
* Reuse production credentials in development or testing.

Use environment variables, a secrets manager, or the approved deployment credential mechanism.

Keep `.env.example` limited to placeholder values and non-sensitive examples.

If a secret is accidentally exposed, report it and recommend immediate rotation. Removing the secret from the current file alone is insufficient.

## 10.2 Authentication and authorization

* Use the approved authentication provider.
* Resolve authenticated identities to active application users.
* Enforce authorization on the backend for every protected operation.
* Apply institution-level access restrictions.
* Check record ownership and assigned scope.
* Validate the current workflow state before performing an action.
* Enforce separation of duties where required.
* Treat UUIDs as identifiers, never as proof of authorization.
* Do not rely on frontend route guards or hidden buttons for security.
* Do not give administrators automatic permission to bypass business workflow rules.

## 10.3 Document security

Uploaded documents are untrusted input.

* Validate size, type, and content.
* Use generated storage keys.
* Keep object storage private.
* Require authorization for document access.
* Respect malware scanning and quarantine states.
* Avoid processing prohibited or unscanned files.
* Avoid public storage URLs.
* Use short-lived signed URLs only when approved.
* Do not log document contents or expose internal storage keys.

## 10.4 Web and API security

Follow the applicable requirements in `API.md`, including:

* HTTPS in production.
* Explicit CORS configuration.
* CSRF protection for cookie-authenticated state-changing requests.
* Safe handling of untrusted input.
* Rate limiting where required.
* Request-size limits.
* Safe error responses.
* Protection against broken access control, injection, XSS, IDOR, and malicious uploads.

Do not weaken security controls to make development or tests easier. Use explicit test-only configuration where needed.

## 10.5 Sensitive information

Minimize the collection, duplication, exposure, and retention of financial and personal information.

* Return only fields the caller is authorized to view.
* Avoid copying extracted document data into unrelated tables.
* Redact sensitive values from logs.
* Preserve auditability without duplicating full documents or secrets into audit records.
* Follow the approved retention and deletion policies.
* Use synthetic data for development and automated tests.

---

# 11. Database Access and Migrations

Follow `DATABASE.md` for schema, ownership, relationships, constraints, indexes, retention, and data provenance.

## 11.1 Database access

* Use the established SQLAlchemy integration and transaction patterns.
* Use parameterized queries and safe ORM operations.
* Avoid raw SQL unless justified and parameterized.
* Keep queries scoped to the caller's authorized institution or administrative scope.
* Do not trust a client-provided `institution_id` without authorization checks.
* Avoid loading entire tables for list pages or dashboards.
* Use pagination for collection endpoints.
* Avoid N+1 query patterns.
* Add indexes only for demonstrated or documented query needs.
* Use transactions for related state changes.
* Apply concurrency control where simultaneous actions could produce conflicting outcomes.

## 11.2 Data integrity

Never:

* Silently overwrite submitted values with OCR results.
* Treat OCR extraction as independent verification.
* Delete historical financial records to simplify a workflow.
* Remove verification or decision history without an approved retention process.
* Use cascading deletion for retained financial, decision, or audit history without explicit approval.
* Bypass database constraints because application code appears to validate the same rule.

Keep submission, verification, lifecycle, extraction, document-scan, and release/refund statuses distinct.

## 11.3 Database migrations

All schema changes must use Alembic migrations.

Before creating a migration:

1. Inspect the current ORM models and database schema.
2. Check existing migration history.
3. Identify affected foreign keys, constraints, indexes, and data.
4. Consider compatibility with existing application versions.
5. Determine whether a data migration is necessary.
6. Test upgrade behavior.
7. Review rollback and forward-recovery implications.

Rules:

* Never edit an already-applied production migration.
* Never rely on implicit production schema creation.
* Never drop or rename production columns without a reviewed migration plan.
* Never perform destructive data migrations without explicit approval.
* Do not modify unrelated tables or constraints.
* Keep migrations deterministic and repeatable.
* Do not add speculative tables or columns.

## 11.4 Database authorization

Backend authorization is mandatory even when PostgreSQL Row-Level Security is enabled.

If RLS is implemented:

* Use trusted request-scoped context.
* Fail closed when scope information is missing or invalid.
* Prevent arbitrary client-supplied identity or institution scope from controlling policies.
* Reset pooled-connection context safely.
* Test cross-institution access under the actual application database role.
* Do not assume that an RLS policy automatically implements business roles or workflow permissions.

---

# 12. API Development Rules

Follow `API.md` for endpoint conventions, authentication, response formats, errors, pagination, integrations, and environment variables.

## 12.1 Endpoint implementation

* Use the established `/api/v1` prefix.
* Follow resource-oriented REST conventions.
* Use typed request and response schemas.
* Keep route handlers focused on HTTP concerns and orchestration.
* Reuse existing authentication, authorization, validation, and error-handling utilities.
* Apply consistent pagination and filtering conventions.
* Validate sorting fields against an allowlist.
* Return only authorized fields.
* Document non-obvious API behavior.

## 12.2 Workflow actions

Do not allow generic PATCH operations to change protected status fields arbitrarily.

Use explicit actions for consequential operations, including:

* Submission.
* Resubmission.
* Verification.
* Discrepancy resolution.
* Replacement initiation.
* Release/refund submission.
* Release/refund decisions.

Each action must validate the caller's permission and the resource's current state.

## 12.3 API contract changes

Before changing an endpoint:

1. Find all callers.
2. Inspect its request and response schemas.
3. Review its authorization behavior.
4. Check frontend and test dependencies.
5. Assess backward compatibility.
6. Update the relevant documentation and tests.

Do not rename, remove, or repurpose API fields without reviewing the impact on existing clients and persisted data.

## 12.4 Idempotency

Use idempotency mechanisms where repeated requests could cause harmful duplicate effects.

Pay particular attention to:

* Submissions.
* Upload retries.
* OCR job creation.
* Verification outcomes.
* Replacement creation.
* Release/refund decisions.
* Scheduled notifications.
* External webhook processing.

Do not introduce a generic idempotency subsystem when an existing unique constraint and transaction provide adequate protection.

---

# 13. Business Workflow Integrity

The coding agent must preserve the business distinctions defined in the project documents.

## 13.1 OCR and verification

* OCR produces candidate field values.
* OCR confidence is not proof of authenticity.
* A successful extraction is not a verification outcome.
* Human review must remain explicit wherever required.
* External confirmation must be recorded only when a real, authorized source provides it.
* Discrepancies must preserve relevant values and resolution history.

## 13.2 Maturity monitoring

* Maturity reminders must use the approved intervals and business timezone.
* Scheduler operations must be safe to repeat.
* A matured instrument is not automatically noncompliant.
* A maturity reminder must not automatically authorize a release or refund.
* Do not invent regulatory consequences not defined by the PRD.

## 13.3 Replacement and renewal

* A replacement instrument is a new record.
* Preserve the predecessor instrument and its history.
* Validate that predecessor and successor belong to the same institution.
* Prevent invalid replacement chains.
* Do not automatically mark the predecessor as released or closed unless the approved workflow permits it.

## 13.4 Release/refund decisions

* Only authorized decision-makers may perform approval or rejection actions.
* Enforce separation of duties where required.
* Preserve decision history.
* Distinguish request submission, administrative approval, and actual financial completion.
* Do not claim that money has been transferred unless the application has an authorized and reliable basis for recording that event.

## 13.5 Auditability

Every consequential business transition must preserve the required history.

* Record the actor when available.
* Record the action and outcome.
* Record the affected resource.
* Record the event time.
* Record minimal relevant context.
* Avoid storing secrets or unnecessary sensitive data.
* Do not silently rewrite historical decisions or audit events.

---

# 14. Testing Requirements

Every meaningful change must include appropriate tests.

A feature is not complete merely because it works in a manual happy-path demonstration.

## 14.1 Backend tests

Use the existing Pytest and HTTPX patterns.

Test:

* Business rules and validation.
* API status codes and response schemas.
* Authorization and institution-level isolation.
* Workflow-state transitions.
* Database constraints.
* Error handling.
* Transaction behavior.
* Duplicate requests and retry safety.
* External dependency failures.

## 14.2 Frontend tests

Use the existing Vitest and React Testing Library patterns.

Test:

* Component rendering.
* Form validation.
* User interactions.
* Loading, empty, success, and error states.
* API error presentation.
* Permission-dependent UI behavior.
* Accessible labels and controls.
* Navigation and state updates where relevant.

Frontend tests do not replace backend authorization tests.

## 14.3 High-priority security tests

Always consider tests that prove:

* An institution representative cannot access another institution's records.
* An unauthorized reviewer cannot verify an instrument.
* A user cannot approve their own submission where prohibited.
* A user cannot access a document by guessing its identifier.
* A generic update cannot bypass workflow rules.
* OCR output cannot silently overwrite submitted values.
* Duplicate requests cannot create duplicate decisions or notifications.
* Invalid or replayed webhooks are rejected, if webhooks are implemented.
* Sensitive fields and secrets are not returned in responses or logs.

## 14.4 Test data

* Use synthetic institutions, users, financial instruments, and documents.
* Do not use real production financial documents in routine tests.
* Avoid shared mutable test data.
* Make tests deterministic.
* Clean up test resources safely.
* Do not weaken production validation just to accommodate a test fixture.

## 14.5 Run relevant tests

After making changes:

1. Run the targeted tests.
2. Run relevant type checks and linting.
3. Run the relevant frontend build or backend validation.
4. Run migration checks if the schema changed.
5. Run broader tests when the change affects shared infrastructure or critical workflows.

If a test cannot be run, state that explicitly and explain why. Never claim that tests passed when they were not executed.

---

# 15. Documentation Rules

Documentation must remain aligned with the implementation.

Update the relevant document when a change alters:

* Product scope or user journeys: `PRD.md`.
* Visual design or UI behavior: `DESIGN.md`.
* Architecture or module boundaries: `ARCHITECTURE.md`.
* Database schema or integrity rules: `DATABASE.md`.
* API contracts or integration behavior: `API.md`.
* Coding-agent procedures: `AGENTS.md`, only when development rules genuinely change.

Also update relevant inline documentation, OpenAPI descriptions, environment examples, and operational instructions where appropriate.

## 15.1 Documentation quality

* Describe actual behavior, not intended future behavior as if it already exists.
* Clearly distinguish implemented features from planned integrations.
* Mark assumptions and decisions requiring approval.
* Use synthetic examples.
* Avoid embedding credentials or sensitive data.
* Keep setup and test instructions reproducible.
* Remove obsolete instructions when they become incorrect.

Do not update every document for every code change. Update only the documents affected by the change.

---

# 16. Git and Change Discipline

Changes must be focused, reviewable, and safe to integrate.

## 16.1 Before editing

* Inspect `git status`.
* Identify uncommitted changes.
* Determine which files belong to the requested task.
* Preserve unrelated user modifications.
* Do not assume the working tree is clean.
* Avoid resetting, checking out, or overwriting files without understanding their current state.

## 16.2 Scope control

* Change only files needed for the requested task.
* Avoid unrelated formatting changes.
* Avoid opportunistic refactoring.
* Do not rename unrelated files or directories.
* Do not reformat entire modules when a focused edit is sufficient.
* Do not remove existing behavior unless the task requires it.
* Do not overwrite user-authored changes.

If a necessary change exposes an adjacent defect, assess whether it must be fixed to complete the task safely. Otherwise, report it separately instead of expanding scope.

## 16.3 Git operations

* Do not force-push.
* Do not rewrite shared history.
* Do not delete branches or tags without explicit authorization.
* Do not create commits unless requested or explicitly permitted by the task environment.
* Do not stage unrelated files.
* Never commit secrets, production data, generated credentials, or local environment files.
* Inspect the final diff before reporting completion.

## 16.4 Dependency and lockfile changes

Modify dependency manifests and lockfiles only when the implementation requires it.

Do not include unrelated dependency upgrades or lockfile churn.

## 16.5 Final diff review

Before completing a task, review:

* Changed files.
* Unexpected file modifications.
* New dependencies.
* API contract changes.
* Database migration risks.
* Security and authorization implications.
* Tests and documentation.
* Accidental debug code or secrets.

---

# 17. Avoiding Overengineering

The project prioritizes a reliable, maintainable MVP.

The coding agent must prefer the smallest solution that satisfies the documented requirements.

Do not introduce the following without a concrete, approved need:

* Microservices.
* Kubernetes.
* Kafka or other distributed messaging infrastructure.
* Multiple databases.
* A general-purpose workflow engine.
* Event sourcing.
* A generalized plugin framework.
* A complex permissions engine beyond the approved role model.
* An analytics warehouse.
* A vector database.
* An LLM for deterministic field comparisons.
* Blockchain.
* A generalized field-history system.
* Multiple competing state-management libraries.
* A new abstraction for a single trivial use case.

A modular monolith is the default architecture.

Optional components such as Celery, Redis, external OCR services, email providers, and bank verification APIs must be introduced only when required by the approved design and implementation needs.

## 17.1 Abstraction test

Before introducing an abstraction, ask:

1. Does it solve a real problem in the current implementation?
2. Does it eliminate meaningful duplication or coupling?
3. Does it improve testability or security?
4. Is it consistent with the documented architecture?
5. Would a simpler local implementation be sufficient?

If a simpler solution meets the requirements, prefer it.

---

# 18. Agent Operating Procedure

For each development task, follow this sequence.

## Step 1: Understand

* Read the task and relevant project documents.
* Inspect the existing code and tests.
* Identify the affected user journey and business rules.
* Identify authorization and data-integrity implications.

## Step 2: Plan

* Determine the smallest compliant implementation.
* Identify affected modules and files.
* Determine whether database, API, UI, or documentation changes are required.
* Identify required tests.
* Identify unresolved assumptions or approval dependencies.

For small, low-risk changes, a brief plan is sufficient. Do not create unnecessary planning artifacts.

## Step 3: Implement

* Follow existing patterns.
* Preserve module boundaries.
* Reuse existing components and utilities.
* Validate untrusted input.
* Enforce authorization on the backend.
* Preserve workflow and historical-data integrity.
* Avoid unrelated changes.

## Step 4: Verify

* Run relevant tests.
* Run applicable type checks, linting, and builds.
* Check migrations where applicable.
* Inspect the final diff.
* Confirm that no secrets or unrelated files were introduced.

## Step 5: Report

Provide a concise summary of:

* What changed.
* Which important files or modules were affected.
* Which tests and checks were run.
* Any checks that could not be run.
* Any unresolved assumptions, risks, or approval requirements.

Do not claim that an implementation is complete if required tests or essential workflow behavior remain unimplemented.

---

# 19. Stop and Ask for Clarification When Necessary

Do not make consequential assumptions about:

* Official verification authority.
* Financial approval rules.
* Institution identity or ownership.
* Separation of duties.
* External bank or government integrations.
* Sensitive-data retention.
* Legal deletion requirements.
* Production credentials or deployment access.
* Changes that could destroy historical financial records.
* Conflicting requirements that affect security or financial correctness.

When clarification is necessary:

1. Explain the specific ambiguity.
2. State why it matters.
3. Offer the smallest reasonable options.
4. Continue with unrelated, safe work where possible.
5. Avoid implementing a speculative behavior as though it were approved.

Do not ask unnecessary questions when the source documents and existing code already provide a clear answer.

---

# 20. Definition of Done

A task is complete only when all applicable conditions are met:

* [ ] The implementation satisfies the requested requirement and relevant project documents.
* [ ] Existing code and conventions were inspected before changes.
* [ ] The change is scoped to the requested work.
* [ ] Existing components, utilities, and dependencies were reused where appropriate.
* [ ] Types and input validation are correct.
* [ ] Backend authorization and institution-level isolation are enforced.
* [ ] Database integrity and workflow history are preserved.
* [ ] Errors and dependency failures are handled appropriately.
* [ ] Relevant tests have been added or updated.
* [ ] Relevant tests and checks have been executed, or unexecuted checks are clearly disclosed.
* [ ] Required migrations and documentation have been updated.
* [ ] No secrets or sensitive production data have been introduced.
* [ ] The final diff has been reviewed.
* [ ] Remaining limitations and approval dependencies are documented.

Not every task requires every checklist item. Apply the checklist proportionately, but never waive mandatory security, data-integrity, or testing requirements merely to finish faster.

---

# 21. Non-Negotiable Rules

Every coding agent working on FDR-SMART must follow these rules:

1. **Inspect before changing.** Never edit unfamiliar code without examining the relevant implementation.
2. **Follow the source documents.** Do not silently invent or change product, architecture, database, or API requirements.
3. **Prefer minimal changes.** Avoid rewrites, unrelated refactors, and unnecessary dependencies.
4. **Reuse existing patterns.** Do not create duplicate components, services, utilities, or abstractions without justification.
5. **Enforce security server-side.** Never rely on frontend behavior as an authorization boundary.
6. **Protect secrets.** Never expose credentials or sensitive configuration to the client, logs, or source control.
7. **Preserve data integrity.** Do not silently overwrite submitted values or erase financial and audit history.
8. **Respect business workflow.** OCR is not verification, maturity is not automatically noncompliance, and approval is not proof of fund transfer.
9. **Validate every boundary.** Treat API input, uploaded documents, and external service responses as untrusted.
10. **Test consequential behavior.** Include authorization, workflow, and failure-path tests where applicable.
11. **Document meaningful changes.** Keep implementation contracts and project documentation aligned.
12. **Protect existing work.** Preserve unrelated user modifications and review the final diff.
13. **Be truthful about verification.** Never claim tests, builds, migrations, or integrations succeeded unless the relevant checks actually ran and passed.
14. **Ask before risky assumptions.** Do not invent financial, regulatory, security, or data-retention policies.

**The governing principle: make the smallest safe change that satisfies the approved requirements, fits the existing codebase, preserves data integrity, and can be verified.**

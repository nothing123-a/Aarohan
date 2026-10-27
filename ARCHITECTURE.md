# ARCHITECTURE.md — FDR-SMART

**Product:** AICTE Security Deposit/FDR Management Portal
**Problem Statement ID:** SIH 26265
**Organization:** All India Council for Technical Education (AICTE)
**Department:** Regulation Bureau
**Architecture Version:** 1.0
**Status:** Proposed — MVP Implementation
**Source of Truth:** `PRD.md` and `DESIGN.md`

---

## 1. Architecture Overview

### 1.1 Objective

Define a secure, maintainable, and practical architecture for building FDR-SMART, a centralized portal for managing security deposits and Fixed Deposit Receipts (FDRs).

The architecture must support:

* Institution-wise and instrument-wise record management.
* Secure document uploads and retrieval.
* OCR-assisted document processing.
* Automated validation and discrepancy detection.
* Verification and scrutiny workflows.
* Maturity monitoring and notifications.
* Renewal and replacement tracking.
* Release and refund request management.
* Role-based dashboards and reporting.
* Auditable administrative actions.

The system must remain simple enough for a small development team to build, test, and demonstrate as part of the Smart India Hackathon (SIH).

### 1.2 Architectural Decision

**Build a modular monolithic web application with a separate background worker for scheduled and asynchronous tasks.**

Use one backend application, one relational database, private document storage, and one frontend application.

Do not introduce microservices, Kubernetes, event streaming, or a complex distributed architecture for the MVP.

The background worker is a separate execution process, not an independently deployed business microservice. It shares the backend's domain logic and database.

### 1.3 High-Level Architecture

The application consists of five primary layers.

1. **Presentation layer:** React web application.
2. **Application layer:** FastAPI backend and business workflows.
3. **Data layer:** PostgreSQL database.
4. **Document layer:** Private object storage.
5. **Background processing layer:** OCR jobs, maturity monitoring, and notification delivery.

External services, such as email providers and bank verification interfaces, remain optional integrations.

### 1.4 System Diagram

The system follows this logical flow:

**Institution Representative / AICTE Official**

↓

**React + TypeScript Frontend**

↓

**HTTPS API Requests**

↓

**FastAPI Backend**

* Authentication and authorization.
* Request validation.
* Business rules.
* Instrument lifecycle management.
* Verification workflows.
* Release/refund workflows.
* Audit logging.

↓

**Application Dependencies**

* PostgreSQL.
* Private document storage.
* OCR processing.
* Background task scheduler and worker.
* Optional notification provider.

↓

**Results returned to authorized users**

The backend is the authoritative enforcement point for permissions, business rules, and data integrity.

The frontend must never be treated as a security boundary.

---

# 2. Recommended Technology Stack

Use the smallest set of technologies that reliably supports the product requirements.

## 2.1 Technology Decisions

| Layer               | Recommended Technology                                              | Reason                                                                     |
| ------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Frontend            | React                                                               | Component-based UI suitable for dashboards and administrative workflows    |
| Language            | TypeScript                                                          | Strong typing for forms, API contracts, and reusable components            |
| Build Tool          | Vite                                                                | Simple development and production build workflow                           |
| Styling             | Tailwind CSS                                                        | Consistent implementation of `DESIGN.md` tokens and layouts                |
| UI Components       | Small set of accessible, reusable components                        | Avoid unnecessary component-library dependencies                           |
| Routing             | React Router                                                        | Client-side navigation and role-specific page routing                      |
| Server State        | TanStack Query                                                      | Request caching, loading states, invalidation, and mutation handling       |
| Forms               | React Hook Form                                                     | Manage structured forms and submission state                               |
| Frontend Validation | Zod                                                                 | Validate form inputs and API response contracts where appropriate          |
| Backend             | Python + FastAPI                                                    | Typed API definitions, request validation, and maintainable business logic |
| Data Validation     | Pydantic                                                            | Validate incoming requests and outgoing response models                    |
| ORM                 | SQLAlchemy 2.x                                                      | Structured database access and transaction management                      |
| Database Migrations | Alembic                                                             | Versioned schema changes                                                   |
| Database            | PostgreSQL                                                          | Relational integrity, transactions, filtering, and reporting               |
| Authentication      | Managed authentication provider or approved identity service        | Avoid implementing password security unnecessarily                         |
| Document Storage    | Private object storage                                              | Secure storage of uploaded financial documents                             |
| OCR                 | Tesseract OCR                                                       | Local document text extraction without requiring an external AI API        |
| PDF Processing      | PyMuPDF                                                             | Extract text from supported PDFs and prepare OCR inputs                    |
| Image Processing    | OpenCV, only where needed                                           | Improve difficult scanned document images                                  |
| Background Jobs     | Celery with Redis, if required for deployment                       | Execute OCR and scheduled tasks outside request handlers                   |
| Notifications       | In-app notifications; optional email provider                       | Support workflow updates and deadline reminders                            |
| Testing             | Pytest, HTTPX, Vitest, React Testing Library                        | Test backend behavior and frontend interactions                            |
| Deployment          | Docker Compose for local development                                | Reproducible development environment                                       |
| Production Hosting  | Approved application hosting and managed PostgreSQL where available | Reduce operational overhead                                                |

### 2.2 Important Technology Constraints

The stack is a recommendation, not a requirement to adopt every listed dependency.

For the initial implementation:

* Use PostgreSQL as the sole application database.
* Use the existing FastAPI backend for business logic.
* Keep document storage separate from ordinary relational records.
* Run OCR asynchronously when processing may take longer than a normal request.
* Add Redis and Celery only when background processing needs justify them.
* Avoid introducing a separate search engine, vector database, or machine-learning platform.

### 2.3 Authentication Decision

Authentication must use a suitable provider or organizational identity service.

For an SIH prototype, a managed provider such as Supabase Auth may be appropriate if permitted by the deployment and data-security requirements.

For a production government deployment, the identity provider must be approved by the organization.

The application must maintain its own authorization rules, regardless of which identity provider is selected.

**Approval required:** Confirm the authentication provider, hosting restrictions, and whether external identity services are permitted.

---

# 3. Architectural Principles

All implementation decisions must follow these principles.

### 3.1 Modular Monolith

Keep related business functionality inside one backend application.

Separate modules by domain rather than deploying each feature as an independent service.

### 3.2 Explicit Business Rules

Verification, maturity monitoring, replacement tracking, and release/refund workflows must use explicit, testable rules.

Do not embed critical business logic exclusively in frontend components or scheduled scripts.

### 3.3 Backend-Enforced Security

Every protected API operation must validate the authenticated user and their permissions.

Hiding a button in the frontend is not sufficient authorization.

### 3.4 Data Integrity

Use database constraints, transactions, foreign keys, and explicit workflow validation to prevent inconsistent records.

### 3.5 Traceability

Important administrative actions must create durable audit records.

Audit history must not be treated as ordinary editable application data.

### 3.6 Human Oversight

OCR and discrepancy rules may identify potential problems, but they must not independently establish authenticity or authorize consequential financial decisions.

### 3.7 Configuration Over Hardcoding

Keep reminder intervals, notification settings, and approved workflow parameters configurable where they are expected to change.

Do not make unconfirmed regulatory requirements permanent assumptions in application code.

---

# 4. Frontend Architecture

## 4.1 Responsibilities

The frontend is responsible for:

* Rendering role-specific pages.
* Displaying instrument records and documents.
* Collecting user input.
* Performing immediate client-side validation.
* Calling backend APIs.
* Showing loading, empty, success, and error states.
* Displaying OCR results and discrepancy warnings.
* Managing local interface state.
* Supporting accessible navigation and responsive layouts.

The frontend must not be responsible for enforcing authoritative financial or administrative rules.

## 4.2 Frontend Structure

Organize the frontend by features and shared components.

### Core Areas

**Application shell**

* Sidebar.
* Top bar.
* Breadcrumbs.
* Main content layout.
* Account menu.

**Shared UI**

* Buttons.
* Inputs.
* Selects.
* Tables.
* Status badges.
* Dialogs.
* Alerts.
* Loading indicators.
* Empty states.
* Error states.
* File upload controls.

**Feature modules**

* Authentication.
* Institution dashboard.
* FDR management.
* Document processing.
* Verification.
* Maturity monitoring.
* Renewal/replacement.
* Release/refund requests.
* Reports.
* Administration.

## 4.3 Frontend State Management

Use three distinct state categories.

### Server State

Use TanStack Query for information retrieved from the backend.

Examples:

* FDR lists.
* Institution details.
* Verification queues.
* Dashboard metrics.
* Request statuses.
* Notifications.
* Audit history.

After a successful mutation, invalidate or update the relevant cached queries.

### Form State

Use React Hook Form for structured forms.

Examples:

* New FDR submission.
* Replacement instrument submission.
* Scrutiny observations.
* Release/refund requests.
* Administrative settings.

### Local UI State

Use ordinary React state for temporary interface behavior.

Examples:

* Sidebar expanded/collapsed.
* Open dialog.
* Selected tab.
* Temporary filter panel.
* Document viewer zoom.

Avoid adding a global state-management library unless a demonstrated requirement emerges.

## 4.4 Frontend Routing

Organize routes around the information architecture defined in `DESIGN.md`.

Representative routes include:

* `/login`
* `/dashboard`
* `/fdrs`
* `/fdrs/new`
* `/fdrs/:instrumentId`
* `/fdrs/:instrumentId/replace`
* `/verification`
* `/verification/:instrumentId`
* `/maturity`
* `/release-requests`
* `/release-requests/new`
* `/release-requests/:requestId`
* `/reports`
* `/notifications`
* `/admin/users`
* `/admin/settings`
* `/admin/audit-logs`

These are proposed frontend routes. The final route map may change during implementation.

The frontend may use route guards for navigation convenience, but the backend must independently enforce all permissions.

## 4.5 API Client

All backend communication should use a shared API client.

The client should provide:

* Consistent request handling.
* Authentication token handling.
* Request timeouts.
* Standard error parsing.
* Response validation where appropriate.
* Correlation identifiers when supported.
* Consistent handling of unauthorized responses.

Do not scatter direct HTTP calls throughout page components.

## 4.6 Frontend Error Handling

The frontend must distinguish:

* Validation errors.
* Authentication failures.
* Permission failures.
* Missing records.
* Network failures.
* Server errors.
* Document processing failures.
* Conflicting updates.

Use inline field errors for form validation and page-level feedback for request failures.

Do not show raw server exceptions or internal implementation details.

---

# 5. Backend Architecture

## 5.1 Responsibilities

The backend is the authoritative application layer.

It must handle:

* Authentication integration.
* Authorization.
* Institution and user associations.
* FDR CRUD operations.
* Document metadata.
* Document upload authorization.
* OCR job creation.
* Field validation.
* Discrepancy detection.
* Verification workflows.
* Maturity monitoring.
* Renewal/replacement relationships.
* Release/refund request workflows.
* Notifications.
* Audit logging.
* Dashboard aggregation.
* Reporting.

## 5.2 Modular Structure

The backend should be organized into domain modules.

### Authentication and Authorization

Responsibilities:

* Validate authentication credentials or tokens.
* Resolve the authenticated user.
* Load role and institution associations.
* Check permissions.
* Reject unauthorized operations.

### Institutions

Responsibilities:

* Institution records.
* Authorized institution-user associations.
* Institution-level access restrictions.
* Institution search.

### Instruments

Responsibilities:

* FDR records.
* Instrument field validation.
* Lifecycle status.
* Renewal and replacement relationships.
* Instrument search.

### Documents

Responsibilities:

* Upload authorization.
* File metadata.
* Secure storage references.
* Document versions.
* Download authorization.
* Integrity metadata.

### Document Processing

Responsibilities:

* OCR job management.
* PDF text extraction.
* OCR processing.
* Extracted field storage.
* Extraction failure handling.

### Verification

Responsibilities:

* Scrutiny records.
* Discrepancy records.
* Review observations.
* Verification sources and outcomes.
* Workflow transitions.

### Monitoring

Responsibilities:

* Maturity checks.
* Reminder eligibility.
* Pending-action identification.
* Scheduled event creation.

### Requests

Responsibilities:

* Release/refund requests.
* Request status.
* Supporting documents.
* Review and decision records.

### Notifications

Responsibilities:

* In-app notifications.
* Optional email delivery.
* Delivery status.
* Retry handling.

### Reporting

Responsibilities:

* Dashboard aggregates.
* Filtered record queries.
* Export generation where supported.

### Audit

Responsibilities:

* Important business event records.
* Actor and timestamp attribution.
* Before/after change metadata where appropriate.
* Audit event retrieval.

## 5.3 Request Processing Pattern

A typical request follows this sequence:

1. FastAPI receives the request.
2. Authentication identifies the user.
3. Authorization checks the user's permissions.
4. Pydantic validates the request structure.
5. The application service enforces business rules.
6. The repository or database layer reads and writes data.
7. An audit event is recorded for applicable actions.
8. The transaction commits.
9. A structured response is returned.

For operations requiring audit records, the business update and audit event should be committed in the same database transaction where practical.

This prevents a successful business update from being committed without its corresponding audit record.

External notifications should not be sent before the transaction commits.

For reliable notification delivery, use a database-backed job or outbox record where needed.

---

# 6. Recommended Folder Structure

Use a single repository for the frontend, backend, deployment configuration, and documentation.

The structure should remain understandable to a small team.

## 6.1 Repository Layout

```
fdr-smart/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── router/
│   │   │   ├── providers/
│   │   │   └── layouts/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── forms/
│   │   │   ├── tables/
│   │   │   ├── feedback/
│   │   │   └── documents/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── institutions/
│   │   │   ├── instruments/
│   │   │   ├── documents/
│   │   │   ├── verification/
│   │   │   ├── maturity/
│   │   │   ├── renewals/
│   │   │   ├── release-requests/
│   │   │   ├── notifications/
│   │   │   ├── reports/
│   │   │   └── administration/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   ├── validation/
│   │   │   └── formatting/
│   │   ├── styles/
│   │   ├── types/
│   │   └── main.tsx
│   ├── tests/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── permissions.py
│   │   │   ├── errors.py
│   │   │   └── logging.py
│   │   ├── api/
│   │   │   ├── router.py
│   │   │   └── dependencies.py
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── institutions/
│   │   │   ├── instruments/
│   │   │   ├── documents/
│   │   │   ├── document_processing/
│   │   │   ├── verification/
│   │   │   ├── monitoring/
│   │   │   ├── requests/
│   │   │   ├── notifications/
│   │   │   ├── reports/
│   │   │   └── audit/
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   ├── storage/
│   │   │   ├── email/
│   │   │   └── jobs/
│   │   └── workers/
│   │       ├── tasks.py
│   │       └── scheduler.py
│   ├── migrations/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── security/
│   ├── requirements/
│   └── pyproject.toml
│
├── deployment/
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── compose.yaml
│
├── docs/
│   ├── PRD.md
│   ├── DESIGN.md
│   ├── ARCHITECTURE.md
│   └── API.md
│
├── .gitignore
├── .env.example
└── README.md
```

This is a recommended logical structure, not a requirement to create every directory immediately.

Create modules when the corresponding functionality is implemented.

## 6.2 Module Organization

Each backend module should separate responsibilities into:

* API endpoints.
* Request and response schemas.
* Application services.
* Database models or repositories where needed.
* Domain rules.
* Tests.

Avoid creating excessive abstractions for simple CRUD operations.

For example, a basic institution lookup does not require multiple layers of interfaces if a straightforward service and database query are sufficient.

---

# 7. Database Architecture

## 7.1 Database Choice

Use PostgreSQL as the primary database.

It provides:

* Relational integrity.
* Transactions.
* Foreign key constraints.
* Indexed search.
* Filtering and sorting.
* Reporting queries.
* JSON support for limited structured metadata where appropriate.

Do not introduce a second application database for the MVP.

## 7.2 Core Entities

The database must represent the following entities:

1. Institution.
2. User profile.
3. User role or permission association.
4. Financial instrument.
5. Document metadata.
6. Document extraction result.
7. Verification record.
8. Discrepancy.
9. Release/refund request.
10. Notification.
11. Audit event.
12. Scheduled notification or background job record where needed.

Some entities may share a table or be represented through related records depending on the finalized data model. The schema should prioritize clarity and integrity over unnecessary normalization.

## 7.3 Relationship Overview

* An institution has many authorized users.
* An institution has many financial instruments.
* An instrument has many document versions.
* An instrument may have multiple extraction results.
* An instrument may have multiple verification records.
* An instrument may have multiple discrepancies.
* An instrument may have replacement instruments.
* An instrument may have multiple administrative requests over time.
* A user may create multiple audit events.
* A user may receive multiple notifications.

Use foreign keys to enforce relationships.

## 7.4 Financial Instrument Fields

At minimum, an instrument record should contain:

* Internal instrument ID.
* Institution ID.
* Instrument reference number.
* Instrument type.
* Issuing bank.
* Branch.
* Amount.
* Currency.
* Issue date.
* Maturity date.
* Submission status.
* Verification status.
* Lifecycle status.
* Predecessor instrument ID, where applicable.
* Created timestamp.
* Updated timestamp.

Additional fields must be introduced only when required by the approved business process.

## 7.5 Distinguish Submitted, Extracted, and Confirmed Data

The system must preserve the provenance of important financial information.

For example, the amount may have:

* A value entered by the institution.
* A value extracted from the document.
* A value corrected by a reviewer.
* A value confirmed through an authorized external source.

These values must not be silently overwritten or treated as equivalent.

Store the source and relevant history for consequential fields.

## 7.6 Database Constraints

Use constraints for:

* Required fields.
* Valid foreign keys.
* Unique internal identifiers.
* Valid financial amounts.
* Valid relationships between dates where appropriate.
* Valid predecessor relationships.
* Unique event or request identifiers.
* Preventing duplicate processing of scheduled events where practical.

Some business rules require application-level checks in addition to database constraints.

For example, whether an instrument may be replaced depends on the applicable workflow, not merely its date fields.

## 7.7 Indexing

Create indexes for common query patterns.

Expected candidates include:

* Instrument ID.
* Institution ID.
* Instrument reference number.
* Verification status.
* Lifecycle status.
* Maturity date.
* Request status.
* Submission date.
* Notification recipient and read status.
* Audit event timestamp and related record ID.

Use compound indexes based on actual query patterns.

Do not create indexes for every column without evidence that they improve performance.

## 7.8 Transactions

Use transactions for related operations.

Examples:

**FDR submission**

* Create the instrument record.
* Associate uploaded document metadata.
* Record the submission event.
* Commit the transaction.

**Verification outcome**

* Record the verification result.
* Update the permitted workflow status.
* Record the audit event.
* Commit the transaction.

**Release/refund decision**

* Record the decision.
* Update the request status.
* Record the audit event.
* Commit the transaction.

Document storage and database transactions cannot generally be committed atomically together. The implementation must handle partial failures.

For example, if a file uploads successfully but its database record fails, the system should clean up the orphaned file where safe or schedule it for cleanup.

## 7.9 Migrations

Use Alembic for schema migrations.

Requirements:

* Every schema change must be versioned.
* Migrations must be reviewed.
* Production schema changes must have a recovery plan.
* Seed data must be separate from schema migrations.
* Test environments must be able to recreate the schema reliably.

## 7.10 Database Access Pattern

Use SQLAlchemy sessions through controlled dependencies.

Each request should have a clearly managed database session.

Avoid:

* Global mutable database sessions.
* Direct database access from frontend code.
* Business logic embedded in arbitrary API route handlers.
* Unbounded queries.
* Returning ORM objects directly without explicit response schemas.

Use pagination for large record sets and validate sorting/filter parameters.

---

# 8. Authentication and Authorization

## 8.1 Authentication Flow

The proposed authentication flow is:

1. The user signs in through the approved authentication provider.
2. The provider authenticates the user.
3. The frontend receives the appropriate session or token.
4. The frontend sends credentials or a bearer token with API requests, according to the provider's integration model.
5. The backend validates the token or authenticated session.
6. The backend resolves the application user.
7. The backend loads the user's role and institution associations.
8. The backend authorizes the requested operation.

The application must not trust role names or institution IDs supplied only by the frontend.

## 8.2 Authorization Model

Use role-based access control combined with record-level authorization.

### Role-Based Access Control

Roles determine which operations a user may perform.

Examples:

* Institution Representative.
* Scrutiny Officer.
* Approving Authority.
* System Administrator.

### Record-Level Authorization

Record-level checks determine which institution, instrument, or request the user may access.

For example, an institution representative may have permission to view FDRs generally but may only access records belonging to their authorized institution.

### Workflow Authorization

Some operations require both role permission and a valid workflow state.

For example, a release/refund approval requires:

* An authenticated user.
* The appropriate approval permission.
* Access to the relevant case.
* A request state that permits approval.
* Any additional required authorization conditions.

## 8.3 Authorization Rules

* Enforce permissions on every protected backend operation.
* Check record ownership or authorized assignment.
* Never rely on hidden buttons as authorization.
* Do not infer financial approval authority from administrative access.
* Prevent institution users from assigning themselves privileged roles.
* Record role changes and permission changes.
* Validate workflow transitions on the backend.

## 8.4 Session Security

Use the authentication provider's recommended session model.

Prefer secure, HTTP-only cookies when supported by the chosen architecture and deployment requirements. If bearer tokens are used, follow the provider's security guidance and avoid exposing long-lived credentials to unnecessary client-side storage.

Additional requirements:

* HTTPS.
* Appropriate token expiration.
* Secure logout.
* Session invalidation where supported.
* Protection against cross-site request forgery when cookie-based authentication requires it.
* Appropriate cross-origin configuration.

## 8.5 Service-Level Authorization

Background workers do not represent human users.

Each job must have a narrowly defined service-level purpose.

A reminder job must not gain the ability to approve requests merely because it can update monitoring records.

---

# 9. API Architecture

## 9.1 API Style

Use a versioned REST API.

Base path:

`/api/v1`

Use JSON for ordinary requests and responses.

Use multipart upload requests or authorized direct-to-storage uploads for document transfer.

Generate OpenAPI documentation through FastAPI.

## 9.2 API Design Principles

* Use resource-oriented endpoints.
* Use standard HTTP methods.
* Return consistent response schemas.
* Validate request bodies.
* Apply authorization before returning sensitive information.
* Use pagination for potentially large collections.
* Use stable internal identifiers.
* Avoid exposing database implementation details.
* Return appropriate HTTP status codes.
* Document error responses.

## 9.3 Proposed Endpoint Groups

### Authentication and Current User

* `GET /api/v1/me`
* `GET /api/v1/me/permissions`

Authentication endpoints should be delegated to the chosen identity provider where appropriate.

### Institutions

* `GET /api/v1/institutions`
* `GET /api/v1/institutions/{institution_id}`
* `POST /api/v1/institutions`
* `PATCH /api/v1/institutions/{institution_id}`

Creation and modification are restricted to authorized roles.

### Instruments

* `GET /api/v1/instruments`
* `POST /api/v1/instruments`
* `GET /api/v1/instruments/{instrument_id}`
* `PATCH /api/v1/instruments/{instrument_id}`
* `GET /api/v1/instruments/{instrument_id}/history`

### Documents

* `POST /api/v1/documents`
* `GET /api/v1/documents/{document_id}`
* `GET /api/v1/documents/{document_id}/download`
* `GET /api/v1/instruments/{instrument_id}/documents`

The exact upload and download mechanism depends on the selected storage provider.

### Document Processing

* `POST /api/v1/documents/{document_id}/extraction-jobs`
* `GET /api/v1/extraction-jobs/{job_id}`
* `GET /api/v1/instruments/{instrument_id}/extractions`

### Verification

* `GET /api/v1/verification-queue`
* `GET /api/v1/instruments/{instrument_id}/verification`
* `POST /api/v1/instruments/{instrument_id}/observations`
* `POST /api/v1/instruments/{instrument_id}/verification-outcomes`

### Renewal and Replacement

* `POST /api/v1/instruments/{instrument_id}/replacements`
* `GET /api/v1/instruments/{instrument_id}/replacements`

### Maturity Monitoring

* `GET /api/v1/maturity`
* `GET /api/v1/maturity/summary`

### Release/Refund Requests

* `GET /api/v1/release-requests`
* `POST /api/v1/release-requests`
* `GET /api/v1/release-requests/{request_id}`
* `POST /api/v1/release-requests/{request_id}/observations`
* `POST /api/v1/release-requests/{request_id}/decisions`

### Notifications

* `GET /api/v1/notifications`
* `POST /api/v1/notifications/{notification_id}/read`

### Dashboard and Reports

* `GET /api/v1/dashboard/summary`
* `GET /api/v1/reports/instruments`
* `GET /api/v1/reports/requests`

### Administration

* `GET /api/v1/admin/users`
* `POST /api/v1/admin/users`
* `PATCH /api/v1/admin/users/{user_id}`
* `GET /api/v1/admin/settings`
* `PATCH /api/v1/admin/settings`
* `GET /api/v1/admin/audit-events`

These are proposed API contracts. Endpoint names and payloads must be finalized during implementation.

## 9.4 API Response Rules

Successful responses must return only the fields required by the client.

Paginated responses should include:

* Items.
* Current page or cursor.
* Page size.
* Total count where practical and needed.

Errors should use a consistent structure containing:

* Stable error code.
* Human-readable message.
* Optional field-level validation details.
* Request correlation ID.

Do not expose stack traces, internal database details, secrets, or storage credentials.

## 9.5 HTTP Status Codes

Use appropriate status codes, including:

* `200 OK` — successful read or update.
* `201 Created` — resource created.
* `202 Accepted` — asynchronous job accepted.
* `204 No Content` — successful operation without a response body.
* `400 Bad Request` — malformed or invalid request.
* `401 Unauthorized` — authentication missing or invalid.
* `403 Forbidden` — authenticated user lacks permission.
* `404 Not Found` — resource not found or not accessible under the chosen privacy policy.
* `409 Conflict` — conflicting state or duplicate operation.
* `413 Content Too Large` — upload exceeds permitted limits.
* `415 Unsupported Media Type` — unsupported content type.
* `422 Unprocessable Content` — structured validation failure.
* `429 Too Many Requests` — rate limit exceeded.
* `500 Internal Server Error` — unexpected server failure.
* `503 Service Unavailable` — temporary service unavailability.

Use a consistent policy for distinguishing malformed requests from semantically invalid fields.

## 9.6 API Pagination and Filtering

List endpoints should support predictable pagination.

Where applicable, allow filtering by:

* Institution.
* Instrument status.
* Verification status.
* Maturity date range.
* Submission date.
* Request status.

The backend must validate allowed filter and sort fields.

Never accept arbitrary SQL expressions or unchecked sort parameters.

## 9.7 API Idempotency

Use idempotency protection for operations where duplicate requests could cause material problems.

Examples:

* FDR submission retries.
* Scheduled reminder creation.
* Background job execution.
* Request submission.
* Notification delivery processing.

An idempotency key or database uniqueness constraint may be appropriate depending on the operation.

Do not introduce idempotency infrastructure for every read-only request.

---

# 10. Data Flow

## 10.1 FDR Submission Flow

1. The institution user enters instrument details.
2. The frontend performs basic validation.
3. The user uploads the supporting document.
4. The backend authenticates and authorizes the request.
5. The backend validates fields and file constraints.
6. The document is stored in private storage.
7. Document metadata is recorded in PostgreSQL.
8. The instrument record is created or updated.
9. The submission event is recorded in the audit history.
10. The transaction commits.
11. An OCR job is scheduled when appropriate.
12. The frontend displays the submission reference and current status.

The implementation must account for partial failures between document storage and database persistence.

## 10.2 OCR Processing Flow

1. A document is submitted for extraction.
2. The backend creates an extraction job.
3. The background worker retrieves the document through an authorized internal mechanism.
4. The worker extracts embedded PDF text where available.
5. If needed, the worker performs OCR on supported pages.
6. The worker identifies supported fields.
7. The extraction results are stored with their source document reference.
8. Extraction errors or low-confidence values are recorded.
9. The frontend retrieves the extraction result.
10. The user or official reviews the extracted information.

The OCR pipeline must not automatically overwrite authoritative instrument fields or independently mark a financial instrument as verified.

## 10.3 Verification Flow

1. The official opens an authorized case.
2. The backend returns the instrument details and supporting evidence.
3. The official reviews extracted fields and discrepancy warnings.
4. The official records an observation or verification outcome.
5. The backend validates the user's permissions and the permitted state transition.
6. The result and relevant status update are committed.
7. The audit event is committed.
8. A notification is queued after successful persistence.
9. The relevant user receives the updated status.

## 10.4 Maturity Monitoring Flow

1. A scheduled job runs according to the configured schedule.
2. The monitoring process queries eligible instruments.
3. It evaluates maturity dates and relevant workflow conditions.
4. It determines which reminders are due.
5. It creates notification or scheduled-event records using duplicate protection.
6. Notification delivery occurs through the configured channel.
7. Delivery outcomes are recorded where available.
8. Unresolved required actions remain visible in the dashboard.

The monitoring job must distinguish a matured instrument from an unresolved renewal requirement.

## 10.5 Release/Refund Flow

1. An institution submits a request.
2. The backend validates access and required fields.
3. The request and supporting document references are stored.
4. The request enters the configured scrutiny workflow.
5. Authorized officials review the request.
6. Additional information may be requested.
7. An authorized decision-maker records a decision.
8. The request status and audit history are updated.
9. Relevant notifications are queued.
10. The request is closed according to the approved workflow.

The MVP records administrative decisions. It does not independently execute financial transfers.

---

# 11. External Services

## 11.1 Authentication Provider

**Purpose:** User authentication and session management.

Requirements:

* Token or session validation.
* Account lifecycle support.
* Secure authentication.
* Integration with application-level roles.
* Support for the deployment's security requirements.

The backend must not rely exclusively on user-supplied role information.

## 11.2 Document Storage

**Purpose:** Store uploaded FDRs and supporting documents.

Requirements:

* Private storage.
* Restricted access.
* Appropriate encryption.
* Upload size limits.
* Integrity checking.
* Access logging where supported.
* Backup and retention policies.

Document storage may be implemented through an approved object storage provider or a suitable private storage service.

For local development, files may be stored in a dedicated private volume.

Do not store production documents in a publicly accessible directory.

## 11.3 OCR Engine

**Purpose:** Extract text from supported documents.

Recommended MVP approach:

* PyMuPDF for embedded PDF text.
* Tesseract OCR for scanned documents.
* OpenCV only when image preprocessing improves extraction quality.

OCR should run within the application environment or an approved processing environment.

Avoid sending sensitive financial documents to an external AI service unless the organization explicitly authorizes that data processing.

## 11.4 Notification Provider

**Purpose:** Deliver reminders and workflow notifications.

MVP:

* In-app notifications stored in PostgreSQL.

Optional:

* Email through an approved provider.

Requirements:

* Authorized recipients.
* Delivery status tracking.
* Retry handling.
* Configurable notification templates.
* Protection against duplicate scheduled reminders.

## 11.5 Bank Verification Integration

**Purpose:** Obtain independent confirmation of financial instrument details where officially supported.

**MVP status:** Not required unless authorized access is confirmed.

Before implementation, establish:

* Official service availability.
* Authentication mechanism.
* Permitted requests and responses.
* Data-sharing authorization.
* Error handling.
* Audit requirements.

Until then, provide an authorized manual verification workflow.

## 11.6 Existing AICTE System Integration

The architecture should allow future API integration without making it a dependency for the MVP.

Do not assume that existing AICTE systems expose usable APIs.

Any integration must:

* Be formally authorized.
* Use documented interfaces.
* Apply appropriate authentication.
* Validate external responses.
* Handle timeouts and failures.
* Record the source and time of received information.

---

# 12. AI and Document Processing Architecture

## 12.1 AI Scope

The MVP does not require a large language model or a custom machine-learning model.

The required automation can be implemented using:

* PDF text extraction.
* OCR.
* Field mapping.
* Rule-based validation.
* Deterministic discrepancy detection.
* Scheduled deadline monitoring.

This is simpler, easier to explain, and more reliable for structured financial information than introducing a general-purpose AI model without a demonstrated need.

## 12.2 Extraction Pipeline

The processing pipeline should contain five stages.

### Stage 1: Document Preparation

* Validate the document type.
* Check size and page limits.
* Extract embedded text where possible.
* Prepare scanned pages for OCR if necessary.

### Stage 2: Text Extraction

* Use embedded PDF text when available.
* Use OCR for scanned content.
* Record extraction failures.

### Stage 3: Field Identification

Identify supported fields, such as:

* Instrument reference number.
* Bank name.
* Amount.
* Issue date.
* Maturity date.

Field identification may use deterministic parsing and document-specific rules.

### Stage 4: Validation

* Validate data types.
* Normalize supported date formats.
* Validate numeric amounts.
* Compare extracted values against institution-entered values.
* Flag missing or conflicting information.

### Stage 5: Human Review

Present the original document alongside extracted values.

Authorized users can correct values and record observations.

## 12.3 Extraction Data Model

Extraction results should be stored separately from the authoritative instrument record.

Each extraction result should contain:

* Extraction ID.
* Document ID.
* Processing status.
* Extracted field values.
* Confidence values where supported.
* Extraction engine/version.
* Processing timestamp.
* Error details where applicable.

This allows reprocessing without losing earlier extraction results.

## 12.4 Discrepancy Rules

Examples:

* Entered amount differs from extracted amount.
* Entered maturity date differs from extracted maturity date.
* Required field is missing.
* Reference number may duplicate an existing instrument.
* Date relationship is invalid.

Each finding should include:

* Rule identifier.
* Relevant field.
* Compared values.
* Source of each value.
* Severity or review category where justified.
* Resolution status.

## 12.5 AI Safety Boundaries

The system must not:

* Claim authenticity based solely on document appearance.
* Treat OCR confidence as proof of authenticity.
* Automatically approve a financial instrument based on extraction.
* Automatically reject an institution based on an unreviewed discrepancy.
* Invent missing financial values.
* Overwrite confirmed information without an authorized workflow.

Any independent authenticity confirmation must come from an authorized bank or another officially accepted verification mechanism.

## 12.6 Future AI Enhancements

Possible future capabilities include:

* More advanced document classification.
* Additional layout recognition.
* Anomaly detection based on validated historical data.
* Administrative case summaries.

These are not MVP dependencies and must not delay delivery of the core workflow.

---

# 13. Background Processing and Scheduling

## 13.1 Tasks Requiring Background Execution

Potential background tasks include:

* OCR processing.
* Scheduled maturity checks.
* Reminder generation.
* Email delivery.
* Report generation for larger datasets.
* Cleanup of orphaned temporary files.

## 13.2 MVP Scheduling Approach

For a small prototype, start with the simplest reliable scheduler that supports the deployment environment.

If OCR and reminder processing require durable queues, retries, or independent worker execution, use Celery with Redis.

Do not run long OCR jobs or recurring deadline checks directly inside ordinary API request handlers.

## 13.3 Job Reliability

Every job should have:

* A defined task type.
* A record or reference identifying its target.
* A processing status.
* Attempt information where retries are supported.
* A completion timestamp.
* A failure reason where applicable.

Jobs must be safe to retry.

For example, retrying a maturity reminder job must not generate unlimited duplicate reminders.

## 13.4 Scheduling Rules

* Use a consistent server timezone.
* Store timestamps in UTC where appropriate.
* Store date-only business values as dates rather than unnecessary timestamps.
* Evaluate maturity rules using the correct business date.
* Keep reminder intervals configurable.
* Prevent overlapping jobs from creating duplicate results.

**Approval required:** Confirm official reminder intervals, timezone expectations, and the scheduling frequency.

---

# 14. Environment Configuration

## 14.1 Environment Separation

Support at least:

* Local development.
* Testing.
* Production.

The team may use a separate staging environment when available.

Never share production credentials with development or testing environments.

## 14.2 Configuration Categories

Configuration must cover:

### Application

* Environment name.
* Application URL.
* API base URL.
* Logging level.
* Allowed frontend origins.

### Database

* Database connection URL.
* Connection pool settings.
* Migration configuration.

### Authentication

* Provider URL.
* Public client configuration where applicable.
* Server-side credentials where required.
* Token validation settings.

### Storage

* Storage provider.
* Bucket or container identifier.
* Server-side credentials.
* Maximum upload size.
* Allowed document types.

### OCR

* OCR engine configuration.
* Supported languages.
* Processing limits.
* Worker concurrency.

### Notifications

* Email provider configuration if enabled.
* Sender configuration.
* Notification retry policy.

### Scheduling

* Reminder intervals.
* Monitoring schedule.
* Job retry configuration.

## 14.3 Secrets Management

* Never commit secrets to source control.
* Provide `.env.example` with placeholders only.
* Store production secrets in an approved secret-management facility.
* Restrict access to credentials.
* Rotate exposed credentials.
* Avoid printing secrets in logs.
* Do not embed server-side credentials in frontend bundles.

## 14.4 Environment Validation

The backend should validate required configuration at startup.

If essential configuration is missing, startup should fail with a clear operational error rather than running in a partially insecure state.

Optional integrations may be disabled explicitly when not configured.

---

# 15. Error Handling and Observability

## 15.1 Error Categories

Use consistent application-level error categories.

Examples:

* Authentication error.
* Authorization error.
* Validation error.
* Resource not found.
* State conflict.
* Document processing failure.
* Storage failure.
* External service failure.
* Unexpected internal error.

## 15.2 Backend Error Handling

The backend must:

* Validate input at the API boundary.
* Translate expected failures into consistent HTTP responses.
* Avoid exposing internal exception details.
* Log unexpected errors with a correlation ID.
* Preserve transaction integrity.
* Roll back failed database transactions.
* Record relevant audit events for failed sensitive operations where appropriate.

Do not catch every exception and return a successful response.

## 15.3 Frontend Error Handling

The frontend must:

* Display field-level validation errors.
* Show page-level errors for failed requests.
* Offer safe retry actions where appropriate.
* Preserve user input where practical.
* Handle session expiration.
* Avoid displaying raw server responses.

## 15.4 Logging

Use structured logs.

Include fields such as:

* Timestamp.
* Severity.
* Request correlation ID.
* Endpoint or task type.
* Outcome.
* Duration.
* Relevant internal record identifier where appropriate.

Do not log:

* Passwords.
* Access tokens.
* Secret keys.
* Full financial documents.
* Unnecessary personal or financial data.

## 15.5 Audit Logs vs Application Logs

These are different systems.

**Application logs** help developers investigate operational problems.

**Audit records** provide durable evidence of administrative actions and important changes.

Audit records must be stored in a controlled data structure and protected from ordinary user modification.

Operational log retention and audit retention may have different requirements.

## 15.6 Health Checks

Provide basic health endpoints for deployment monitoring.

A liveness check should establish whether the application process is running.

A readiness check should establish whether the application can serve requests, including critical dependency availability as appropriate.

Do not expose detailed internal infrastructure information through public health endpoints.

---

# 16. Security Architecture

Security is a primary requirement because the system handles financial documents and institution-related information.

## 16.1 Trust Boundaries

The system contains several trust boundaries.

### Boundary A: Browser to Backend

All requests must be treated as untrusted.

The backend must validate:

* Authentication.
* Permissions.
* Request data.
* File metadata.
* Requested record access.

### Boundary B: Backend to Database

Database access must use controlled credentials and parameterized operations.

The application must enforce data integrity through transactions and constraints.

### Boundary C: Backend to Document Storage

Storage credentials must remain server-side.

Document retrieval must require authorization.

Publicly accessible storage URLs are not permitted for confidential financial documents.

### Boundary D: Background Worker

Workers must process only authorized internal jobs.

They must not trust arbitrary document paths or job parameters supplied by an unauthenticated client.

### Boundary E: External Providers

External authentication, storage, email, and verification providers must be treated as independent systems that can fail or return unexpected data.

## 16.2 File Upload Security

The upload pipeline must:

1. Authenticate the user.
2. Authorize access to the target institution or request.
3. Validate permitted file types.
4. Enforce size and processing limits.
5. Generate safe internal storage identifiers.
6. Avoid trusting client-provided filenames.
7. Scan files for malware where supported.
8. Store files in private storage.
9. Record metadata.
10. Restrict download access.

Do not execute uploaded files.

PDF and image processing libraries should be updated regularly and run with appropriate resource limits.

## 16.3 Authorization and Data Isolation

Institution-level data isolation is mandatory.

The backend must not rely on frontend filtering to restrict access.

For every relevant request, verify that the user has access to the specific institution, instrument, document, or administrative request.

Test direct-object-reference attacks, such as changing an instrument ID in the URL or API request.

## 16.4 Sensitive Decisions

For verification, approval, rejection, and release/refund actions:

* Check role permissions.
* Check the current workflow state.
* Validate required inputs.
* Record the actor.
* Record the timestamp.
* Preserve the decision reason where required.
* Commit the decision and audit event consistently.

Do not allow ordinary CRUD endpoints to bypass the defined workflow.

## 16.5 Database Security

* Use a dedicated application database account.
* Grant only the required database privileges.
* Use encrypted connections where required by the deployment.
* Protect database credentials.
* Restrict network access.
* Use parameterized database operations.
* Establish backups and restoration procedures.
* Protect audit data from unauthorized alteration.

## 16.6 Transport and Storage Security

* Use HTTPS for deployed environments.
* Encrypt stored documents where supported and required.
* Restrict access to storage buckets and containers.
* Avoid exposing private storage paths.
* Use short-lived signed URLs only when the selected storage model requires them, with authorization checks before issuance.
* Follow approved retention and deletion policies.

## 16.7 Web Application Security

The application should protect against:

* Broken access control.
* Injection attacks.
* Cross-site scripting.
* Cross-site request forgery where applicable.
* Insecure direct object references.
* Malicious file uploads.
* Session misuse.
* Excessive request rates.
* Sensitive information disclosure.

Apply appropriate security headers, request-size limits, rate limits, and dependency updates.

## 16.8 Production Compliance

The production deployment must follow the security, privacy, retention, and hosting requirements approved by AICTE and the responsible organization.

The MVP architecture does not itself establish compliance with any government security certification or regulatory standard.

---

# 17. Testing Strategy

Testing must validate both functional behavior and security boundaries.

## 17.1 Backend Unit Tests

Use Pytest for:

* Instrument validation.
* Workflow transition rules.
* Maturity calculations.
* Reminder eligibility.
* Discrepancy detection.
* Authorization policies.
* Replacement relationship validation.
* Release/refund decision rules.

## 17.2 API Integration Tests

Use HTTPX with the FastAPI testing infrastructure.

Test:

* Authentication behavior.
* Authorization.
* FDR submission.
* Document metadata.
* Verification outcomes.
* Renewal/replacement.
* Release/refund requests.
* Notifications.
* Reports.
* Audit history.

Use an isolated test database.

## 17.3 Frontend Tests

Use Vitest and React Testing Library.

Test:

* Form validation.
* Loading and empty states.
* Error messages.
* Status badges.
* Role-dependent navigation.
* Document upload feedback.
* Submission and decision flows.
* Accessibility-relevant interactions.

## 17.4 End-to-End Tests

Use an end-to-end testing framework if time permits.

Prioritize the following scenarios:

1. Institution submits an FDR.
2. OCR extracts supported fields.
3. A discrepancy is flagged.
4. An official records a verification outcome.
5. A maturity reminder is generated.
6. A replacement instrument is linked to its predecessor.
7. A release/refund request follows the configured workflow.
8. Unauthorized access is blocked.

## 17.5 Security Tests

Test:

* Cross-institution record access.
* Unauthorized document download.
* Privilege escalation.
* Invalid workflow transitions.
* Missing authentication.
* Invalid token handling.
* Manipulated record identifiers.
* Oversized or unsupported uploads.
* Sensitive information in error messages.
* Unauthorized audit record modification.

## 17.6 Data Integrity Tests

Test:

* Duplicate identifiers.
* Invalid date relationships.
* Concurrent updates.
* Failed transaction rollback.
* Replacement links.
* Duplicate scheduled jobs.
* Notification retry behavior.
* Orphaned document cleanup.

## 17.7 Test Data

Use synthetic institution and FDR data by default.

Test documents should contain deliberately seeded examples of:

* Correct fields.
* Missing values.
* Mismatched amounts.
* Mismatched dates.
* Duplicate references.
* Unreadable scans.
* Unsupported document formats.

Do not use real institutional financial documents without authorization.

---

# 18. Deployment Architecture

## 18.1 MVP Deployment

Use a simple deployment with the following components:

1. Frontend hosting.
2. FastAPI backend.
3. PostgreSQL database.
4. Private document storage.
5. Background worker and scheduler when required.
6. Optional email provider.

These components may be hosted on an approved cloud environment or suitable institutional infrastructure.

## 18.2 Local Development

Use Docker Compose where practical to standardize:

* Frontend.
* Backend.
* PostgreSQL.
* Redis and worker processes, if needed.

External services may use test configurations or local substitutes where appropriate.

## 18.3 Production Deployment

Production should use:

* Approved application hosting.
* HTTPS termination.
* Private database networking.
* Private document storage.
* Managed secrets.
* Database backups.
* Monitoring and error reporting.
* Controlled deployment procedures.

Do not expose PostgreSQL directly to the public internet.

## 18.4 CI/CD

A basic CI pipeline should:

1. Install dependencies.
2. Run frontend linting and type checks.
3. Run frontend tests.
4. Run backend linting and type checks where configured.
5. Run backend unit tests.
6. Run API integration tests.
7. Build the frontend.
8. Build the backend container.
9. Check dependency and image vulnerabilities where tooling is available.

Production deployment should require successful checks and an approved release process.

## 18.5 Database Migrations

Run migrations through a controlled deployment step.

Do not allow multiple application replicas to race to perform schema migrations automatically during startup.

Before production migrations:

* Review the migration.
* Back up relevant data where required.
* Verify the migration against a test environment.
* Define a recovery plan.

## 18.6 Backup and Recovery

Production operations must define:

* Database backup frequency.
* Document backup or replication policy.
* Retention period.
* Restoration procedure.
* Recovery objectives.

These values require stakeholder approval based on the importance and volume of the records.

A backup is not considered sufficient until restoration has been tested.

---

# 19. MVP Versus Future Scalability

The MVP should prioritize functional correctness, security, and demonstrability.

## 19.1 MVP Architecture

Use:

* One React application.
* One FastAPI application.
* One PostgreSQL database.
* Private document storage.
* A simple scheduled monitoring mechanism.
* A background worker if OCR or notification workloads require it.
* In-app notifications.
* Optional email delivery.
* OCR and deterministic validation.
* Basic operational logging and audit history.

This is sufficient to demonstrate the main product lifecycle.

## 19.2 Future Enhancements

Only introduce these when justified by real requirements.

### Separate Worker Scaling

Run additional worker processes if OCR or notification workloads grow.

### Advanced Job Infrastructure

Introduce a more robust queue or scheduling system if job volume, retry requirements, or delivery guarantees demand it.

### Bank Verification Integration

Add a dedicated integration module once an authorized bank verification interface is available.

### Existing AICTE Integration

Implement documented interfaces and approved data exchange.

### Advanced Reporting

Add optimized reporting queries, materialized views, or dedicated analytics infrastructure only if the main database cannot meet performance requirements.

### Advanced Document Processing

Introduce more capable extraction models only when measured OCR limitations justify the added complexity.

### High Availability

Add multiple application instances, stronger database failover, and redundant infrastructure according to production availability requirements.

### Audit Integrity Enhancements

Add external audit export, signed audit checkpoints, or other tamper-evidence mechanisms if organizational policy requires them.

## 19.3 Explicitly Avoid for the MVP

Do not introduce:

* Microservices.
* Kubernetes.
* Kafka or other event streaming infrastructure.
* A vector database.
* A separate search engine without a demonstrated need.
* A large language model for simple field comparisons.
* A dedicated analytics platform.
* Blockchain.
* Multiple application databases.
* A complex event-sourcing architecture.

These technologies would increase development and operational effort without being necessary to meet the current requirements.

---

# 20. Key Architectural Decisions and Open Questions

| ID     | Decision                        | Current Recommendation                                 | Approval or Validation Needed                         |
| ------ | ------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| ADR-01 | Application architecture        | Modular monolith                                       | No, unless organizational standards dictate otherwise |
| ADR-02 | Frontend                        | React + TypeScript                                     | Confirm team preference                               |
| ADR-03 | Backend                         | FastAPI                                                | Confirm team preference                               |
| ADR-04 | Database                        | PostgreSQL                                             | Confirm deployment availability                       |
| ADR-05 | Authentication                  | Approved managed or organizational provider            | Yes                                                   |
| ADR-06 | Document storage                | Private object storage                                 | Yes, for production hosting                           |
| ADR-07 | OCR                             | Tesseract + PDF text extraction                        | Validate against representative documents             |
| ADR-08 | Background processing           | Simple scheduler initially; Celery + Redis when needed | Confirm deployment needs                              |
| ADR-09 | Notifications                   | In-app first, optional email                           | Confirm approved channels                             |
| ADR-10 | Bank integration                | Deferred until authorized interface exists             | Yes                                                   |
| ADR-11 | Existing AICTE integration      | Deferred until API access is confirmed                 | Yes                                                   |
| ADR-12 | Reminder intervals              | Configurable                                           | Yes                                                   |
| ADR-13 | Audit retention                 | Organization-defined policy                            | Yes                                                   |
| ADR-14 | Hosting and production security | Approved infrastructure                                | Yes                                                   |
| ADR-15 | Data migration                  | Excluded from initial prototype unless required        | Yes                                                   |

---

# 21. Implementation Order

Implement the system in the following order.

## Phase 1: Foundation

1. Establish the repository and development environment.
2. Configure frontend and backend projects.
3. Configure PostgreSQL.
4. Set up migrations.
5. Implement authentication integration.
6. Implement role and institution authorization.
7. Establish common API error handling.
8. Implement audit logging.

## Phase 2: Core Records

1. Institution management.
2. FDR registration.
3. FDR list and details.
4. Document upload and retrieval.
5. Search and filtering.
6. Record history.

## Phase 3: Verification

1. Scrutiny queue.
2. Verification workspace.
3. OCR extraction.
4. Discrepancy detection.
5. Observation and response workflow.
6. Verification outcomes.

## Phase 4: Monitoring and Lifecycle

1. Maturity monitoring.
2. Scheduled reminders.
3. Renewal/replacement relationships.
4. Notification history.
5. Dashboard summaries.

## Phase 5: Administrative Requests

1. Release/refund submission.
2. Request review.
3. Authorized decision workflow.
4. Status notifications.
5. Request history and reporting.

## Phase 6: Validation and Deployment

1. Complete functional tests.
2. Complete authorization tests.
3. Test background-job reliability.
4. Verify dashboard accuracy.
5. Verify document access controls.
6. Populate synthetic demonstration data.
7. Prepare deployment documentation.
8. Run the end-to-end SIH demonstration.

---

# 22. Definition of Architectural Completion

The architecture is considered correctly implemented when:

* The frontend communicates with the backend through documented APIs.
* Business rules are enforced on the backend.
* Database relationships and constraints preserve data integrity.
* Institution records are isolated by authorization.
* Documents remain private and access-controlled.
* OCR results remain distinct from authoritative instrument data.
* Verification and release/refund actions follow explicit workflow rules.
* Important business updates produce durable audit records.
* Maturity monitoring is repeatable and does not create duplicate reminders.
* Failures are handled without silently corrupting records.
* The application can be tested and deployed reproducibly.
* External integrations are isolated behind clear interfaces.
* The architecture can accommodate future requirements without requiring premature distributed infrastructure.

---

# 23. Final Architectural Decision

FDR-SMART will be implemented as a **modular monolithic web application using React, TypeScript, FastAPI, and PostgreSQL, with private document storage and background processing for OCR, maturity monitoring, and notifications as needed.**

The backend will enforce authentication, authorization, business rules, and audit requirements. The frontend will provide role-specific workflows and consistent feedback. OCR and rule-based automation will reduce repetitive work without replacing independent verification or authorized administrative decisions.

External bank and AICTE integrations will remain optional until their availability and authorization are confirmed.

The architecture prioritizes a secure, maintainable, and demonstrable MVP while preserving clear boundaries for future scaling.

**Core architectural principle: Build the simplest system that reliably manages the complete FDR lifecycle, protects sensitive records, and makes every important administrative action traceable.**

# PRD.md — AICTE Security Deposit/FDR Management Portal

**Product Name:** FDR-SMART
**Problem Statement ID:** SIH 26265
**Problem Statement:** Streamline of Security Deposit/FDR Portal
**Organization:** All India Council for Technical Education (AICTE)
**Department:** Regulation Bureau
**Category:** Software
**Theme:** Smart Automation
**Document Version:** 1.0
**Status:** Proposed — Pending stakeholder validation

---

## 1. Product Overview

### 1.1 Product Vision

Build a centralized, secure, and user-friendly web application for managing security deposits and Fixed Deposit Receipts (FDRs) associated with applicable AICTE approval-related processes.

The platform will enable institutions to submit and track financial instrument records, assist authorized officials with document scrutiny, monitor maturity dates, manage renewals and replacements, and process release or refund requests through controlled administrative workflows.

The system will combine structured record management with practical automation to reduce repetitive work, improve visibility into pending cases, and maintain a traceable history of important actions.

### 1.2 Problem Statement

Managing security deposits and FDRs requires maintaining institution-wise records, collecting supporting documents, reviewing submitted information, verifying financial instruments, monitoring validity and maturity dates, tracking renewal requirements, and processing release or refund requests.

When information is maintained across fragmented records, manual correspondence, or multiple tracking mechanisms, administrative stakeholders may struggle to maintain accurate records, identify upcoming deadlines, and determine the current status of individual cases.

AICTE needs a centralized mechanism to manage these activities throughout the lifecycle of each instrument while maintaining appropriate security, accountability, and compliance with applicable regulations.

### 1.3 Proposed Solution

FDR-SMART will provide a unified portal with two primary user experiences:

1. **Institution Portal:** Enables authorized institution representatives to submit FDR records, upload documents, respond to observations, submit renewal or replacement instruments, and track applicable requests.
2. **AICTE Administration Portal:** Enables authorized officials to review records, investigate discrepancies, record verification outcomes, monitor maturity dates, manage requests, and access management reports.

The system will provide OCR-assisted document extraction, rule-based validation, configurable deadline reminders, workflow tracking, and audit logging.

Automated processing will assist administrative users but will not independently establish the authenticity of an FDR or authorize financial releases.

### 1.4 Product Principles

* **Centralized records:** Each institution and financial instrument has a structured, searchable record.
* **Human oversight:** Consequential verification and approval decisions remain with authorized officials.
* **Traceability:** Important submissions, changes, observations, and decisions are recorded.
* **Practical automation:** Automate repetitive checks and reminders without introducing unnecessary complexity.
* **Security by design:** Financial documents and institutional information are accessible only to authorized users.
* **Workflow transparency:** Users can understand the current status and next required action for their cases.

---

## 2. Problem, Value Proposition, and Target Users

### 2.1 Problems to Solve

| Problem                                       | Impact                                                             | Proposed Capability                       |
| --------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| Fragmented institution and instrument records | Difficult to establish a complete view of an instrument            | Centralized FDR repository                |
| Repetitive manual data entry                  | Increased administrative effort                                    | OCR-assisted field extraction             |
| Missing information and inconsistent values   | Additional scrutiny and potential delays                           | Validation and discrepancy detection      |
| Difficulty tracking maturity dates            | Time-sensitive actions may be overlooked                           | Automated maturity monitoring             |
| Limited renewal history                       | Difficult to identify the current instrument and previous versions | Linked renewal and replacement records    |
| Release requests require follow-up            | Limited visibility into pending administrative actions             | Request tracking and controlled workflows |
| Limited visibility into pending cases         | Officials may need to consult multiple records                     | Consolidated dashboard and reports        |
| Incomplete action history                     | Difficult to reconstruct administrative decisions                  | Audit trail and document history          |

These problems are derived from the SIH problem statement. Their current frequency and severity within AICTE require validation.

### 2.2 Value Proposition

**For institutions:** A single place to submit, update, and track their authorized FDR records and administrative requests.

**For AICTE officials:** A consolidated view of instrument status, pending scrutiny, discrepancies, upcoming maturity dates, and requests awaiting action.

**For the organization:** Reduced repetitive administrative work, better record traceability, improved deadline visibility, and more consistent financial document management.

### 2.3 Target Users

#### A. Institution Representative

An authorized representative of a technical institution.

Primary needs:

* Submit FDR information and documents.
* Track submission status.
* Respond to scrutiny observations.
* Submit renewal or replacement documents.
* Track release or refund requests where applicable.
* Receive relevant notifications.

#### B. Scrutiny Officer

An authorized official responsible for reviewing submitted records.

Primary needs:

* Review assigned or otherwise authorized cases.
* Examine documents and extracted information.
* Investigate discrepancies.
* Request additional information.
* Record observations and verification outcomes.
* Monitor pending cases.

#### C. Approving Authority

An official authorized to make specified administrative decisions.

Primary needs:

* Review cases referred for approval.
* Examine supporting evidence and scrutiny findings.
* Approve, reject, or return requests within their authority.
* Record decisions and reasons.
* Review case history.

#### D. System Administrator

A user responsible for application configuration and account administration.

Primary needs:

* Manage users and roles.
* Maintain institution and reference data where authorized.
* Configure reminder rules and workflow settings.
* Monitor system operation.
* Review relevant audit events.

**Permission boundary:** Administrative access to the software must not automatically confer authority to approve financial instruments or release deposits.

---

## 3. Goals and Non-Goals

### 3.1 Product Goals

The MVP must:

1. Centralize institution-wise and instrument-wise records.
2. Provide secure digital document management.
3. Support structured FDR submission and review.
4. Extract supported document fields where OCR is feasible.
5. Flag incomplete information and discrepancies.
6. Monitor maturity dates and configured deadlines.
7. Generate reminders for upcoming deadlines and pending actions.
8. Maintain renewal and replacement history.
9. Track release or refund requests.
10. Provide role-specific dashboards.
11. Maintain an auditable history of important actions.
12. Demonstrate measurable improvements using test data.

### 3.2 Non-Goals

The MVP will not:

* Replace AICTE regulations or prescribed administrative procedures.
* Automatically declare an FDR genuine based on its appearance or extracted text.
* Automatically approve financial instruments based solely on OCR or validation results.
* Transfer money or independently execute a refund.
* Claim live integration with AICTE or bank systems without an implemented, authorized connection.
* Implement blockchain without a demonstrated requirement.
* Introduce predictive machine learning without a validated use case and suitable historical data.
* Build a mobile application when a responsive web application meets the MVP requirements.
* Replace existing AICTE systems before the required integration and migration arrangements are established.

---

## 4. Assumptions and Decisions Requiring Approval

The PRD distinguishes between proposed product behavior and confirmed organizational requirements.

### 4.1 Working Assumptions

| ID   | Assumption                                                                                   | Consequence                                                           |
| ---- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| A-01 | The MVP is a browser-based web application.                                                  | No native mobile application is required.                             |
| A-02 | Institutions and authorized AICTE officials use separate role-based interfaces.              | The application must support institution-level data isolation.        |
| A-03 | Financial instruments can be represented as structured records linked to uploaded documents. | A relational data model is appropriate.                               |
| A-04 | OCR can assist with supported document formats.                                              | OCR output requires review when uncertain or consequential.           |
| A-05 | Maturity reminder intervals can be configured.                                               | Reminder schedules must not be hard-coded as official policy.         |
| A-06 | Release and refund requests require authorized review.                                       | The system records decisions rather than directly transferring money. |
| A-07 | The initial prototype can use synthetic or otherwise authorized test data.                   | Live production data is not necessary for demonstration.              |
| A-08 | Bank and AICTE integration access is not yet confirmed.                                      | Integrations remain optional until verified.                          |
| A-09 | Exact regulatory rules and current internal workflows have not been supplied.                | Workflow configuration must remain adaptable.                         |

### 4.2 Decisions Requiring Stakeholder Approval

| ID   | Decision                                                             | Proposed Default                                                             |
| ---- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| D-01 | What are the official FDR submission and verification procedures?    | Configure a provisional workflow and validate it before production.          |
| D-02 | Which institution types and instrument categories must be supported? | Support the categories explicitly required by the initial use case.          |
| D-03 | What fields are mandatory for each instrument type?                  | Define a configurable field set based on applicable requirements.            |
| D-04 | What are the official maturity and renewal reminder intervals?       | Use configurable demonstration intervals until approved.                     |
| D-05 | Which officials can verify, recommend, approve, or reject requests?  | Use explicit role permissions and case-level authorization.                  |
| D-06 | What conditions must be satisfied before release or refund?          | Implement only the approved administrative rules.                            |
| D-07 | Which bank verification mechanisms are available and authorized?     | Use a manually recorded verification outcome until integration is confirmed. |
| D-08 | Must the portal integrate with existing AICTE systems?               | Design clear integration boundaries without assuming API availability.       |
| D-09 | Which notification channels are permitted?                           | Provide in-app notifications; add email if approved and available.           |
| D-10 | What are the document retention and deletion requirements?           | Follow the retention policy approved by the organization.                    |
| D-11 | What are the expected user volume and document storage requirements? | Establish capacity targets after expected scale is confirmed.                |
| D-12 | Which deployment environment and security standards are mandatory?   | Confirm before production deployment.                                        |

---

## 5. Core User Journeys

### 5.1 Journey A: Submit a New FDR

**Actor:** Institution Representative

1. The user signs in.
2. The user opens the institution's FDR management page.
3. The user selects **Add New FDR**.
4. The user enters the instrument details.
5. The user uploads the FDR document and required supporting records.
6. The system validates mandatory fields and date relationships.
7. The system attempts OCR extraction for supported documents.
8. The user reviews the extracted values against the original document.
9. The system flags any detected discrepancies.
10. The user submits the record.
11. The system creates an instrument record and reference number.
12. The record enters the configured review workflow.
13. The user can track the submission status.

**Success condition:** The submitted record is stored, associated with the correct institution, and visible in the appropriate review queue.

### 5.2 Journey B: Review and Verify an FDR

**Actor:** Scrutiny Officer

1. The official opens the pending review queue.
2. The official selects a record.
3. The system displays the instrument details and submitted documents.
4. The official reviews OCR output and automated validation results.
5. The official investigates discrepancies.
6. If information is missing, the official records an observation and requests additional information.
7. The institution submits a response.
8. The official reviews the response and records the verification outcome.
9. The system updates the workflow status.
10. The system records the action in the audit history.
11. The relevant user receives a status notification.

**Success condition:** The case has a traceable review outcome and an accurate current status.

### 5.3 Journey C: Monitor an Approaching Maturity Date

**Actor:** System Scheduler and relevant users

1. The system periodically checks instruments with applicable maturity dates.
2. The monitoring service identifies instruments within a configured reminder window.
3. The system determines whether a reminder has already been generated for that scheduled event.
4. The system creates a notification for the appropriate recipients.
5. The dashboard highlights the approaching deadline.
6. The institution submits a renewal or replacement instrument where required.
7. The official reviews the new submission.
8. The system updates the linked records after the required workflow action.
9. Unresolved required actions remain visible for follow-up.

**Success condition:** Applicable deadlines are visible and reminders are generated according to configured rules.

### 5.4 Journey D: Submit a Renewal or Replacement

**Actor:** Institution Representative and Scrutiny Officer

1. The institution opens an existing instrument.
2. The user selects the renewal or replacement action, where applicable.
3. The user uploads the new instrument and supporting details.
4. The system creates a new instrument record.
5. The new record is linked to the previous instrument.
6. The new record enters the review workflow.
7. The official reviews and records the outcome.
8. The system retains the previous record and its history.
9. The monitoring process uses the appropriate instrument status and dates.

**Success condition:** The relationship between the previous and replacement instruments is preserved, and the current applicable instrument is identifiable.

### 5.5 Journey E: Request Release or Refund

**Actor:** Institution Representative, Scrutiny Officer, Approving Authority

1. The institution opens an eligible instrument record.
2. The user initiates a release or refund request where permitted.
3. The user supplies the required information and documents.
4. The system creates a request reference.
5. The request enters the configured scrutiny queue.
6. The scrutiny officer reviews the request.
7. Additional information is requested if needed.
8. The case is routed to the authorized decision-maker.
9. The decision-maker records the decision and reason.
10. The system updates the request status.
11. The institution receives a notification.
12. The complete request history remains available to authorized users.

**Success condition:** The request has a traceable outcome, and no unauthorized user can approve or execute the release.

### 5.6 Journey F: Monitor the Overall Portfolio

**Actor:** Authorized AICTE Official

1. The official opens the administration dashboard.
2. The dashboard displays summary metrics.
3. The official filters instruments by status, institution, or relevant date.
4. The official opens a category such as pending verification.
5. The official reviews the corresponding records.
6. The official identifies cases requiring intervention.
7. The official generates an authorized report if needed.

**Success condition:** Dashboard summaries accurately reflect the underlying records and help officials identify pending work.

---

## 6. User Stories

### Institution Representative

* **US-01:** As an institution representative, I want to submit an FDR with structured details and supporting documents so that the information is available in one place.
* **US-02:** As an institution representative, I want to review automatically extracted values so that I can correct mistakes before submission.
* **US-03:** As an institution representative, I want to see the status of each submission so that I know whether any action is required.
* **US-04:** As an institution representative, I want to respond to scrutiny observations so that incomplete submissions can be resolved.
* **US-05:** As an institution representative, I want to submit replacement instruments so that the system can maintain an up-to-date record.
* **US-06:** As an institution representative, I want to track release or refund requests so that I can see their current administrative status.
* **US-07:** As an institution representative, I want to receive reminders about relevant deadlines so that I can take required action in time.

### Scrutiny Officer

* **US-08:** As a scrutiny officer, I want to see pending records so that I can prioritize my review work.
* **US-09:** As a scrutiny officer, I want to compare submitted values with extracted document values so that discrepancies are easier to identify.
* **US-10:** As a scrutiny officer, I want to request additional information so that incomplete cases can be resolved.
* **US-11:** As a scrutiny officer, I want to record observations and verification outcomes so that the case history is clear.
* **US-12:** As a scrutiny officer, I want to filter cases by deadline and status so that urgent matters are easier to identify.

### Approving Authority

* **US-13:** As an approving authority, I want to review requests with supporting documents and scrutiny findings so that I can make informed decisions.
* **US-14:** As an approving authority, I want to record a decision and its reason so that the outcome is traceable.
* **US-15:** As an approving authority, I want to see relevant case history so that earlier actions are available during review.

### System Administrator

* **US-16:** As a system administrator, I want to assign roles and permissions so that users only access authorized functionality.
* **US-17:** As a system administrator, I want to configure reminder rules so that notifications follow approved requirements.
* **US-18:** As a system administrator, I want to review system and audit events so that relevant operational issues can be investigated.

---

## 7. Functional Requirements

### FR-01: Authentication and Authorization

* Require authentication before access to protected pages and APIs.
* Assign each user an explicit role.
* Enforce authorization on the backend, not only in the user interface.
* Restrict institution users to their authorized institution records.
* Restrict official access according to assigned permissions and case scope.
* Restrict approval actions to authorized roles.
* Record relevant security events.
* Support secure logout and session expiration.

**Acceptance criteria:**

* An institution user cannot retrieve another institution's records by changing an identifier.
* A user without approval permission cannot approve a request.
* Unauthorized API requests are rejected.

### FR-02: Institution Management

* Store institution identity and contact information.
* Associate institution users with the correct institution.
* Prevent unauthorized modification of institution identity.
* Detect duplicate institution identifiers.
* Support permitted administrative updates.
* Record important changes.

**Acceptance criteria:**

* Each instrument is associated with an institution.
* Duplicate identifiers are flagged or rejected.
* Users can only access authorized institution information.

### FR-03: FDR Record Management

* Create, view, and update instrument records according to permissions.
* Assign each record a unique internal identifier.
* Store the instrument reference number, issuing bank, amount, issue date, maturity date, and applicable status fields.
* Associate each record with its supporting documents.
* Validate required fields and date relationships.
* Preserve historical information.
* Support search and filtering.

**Acceptance criteria:**

* A valid submission creates a unique record.
* Invalid date relationships are flagged.
* Missing mandatory information is identified.
* Authorized users can retrieve records by supported search criteria.

### FR-04: Document Management

* Support approved document formats.
* Associate each document with an instrument or administrative request.
* Store documents in private storage.
* Enforce file size and file type restrictions.
* Preserve document versions when replacements are uploaded.
* Prevent unauthorized document retrieval.
* Record relevant upload and replacement actions.
* Apply malware scanning where supported.

**Acceptance criteria:**

* Authorized users can access permitted documents.
* Unauthorized users cannot retrieve documents using guessed URLs.
* Replacing a document does not silently erase its history.

### FR-05: OCR and Field Extraction

* Extract supported fields from eligible PDFs or images.
* Preserve a reference to the source document.
* Record extraction results and confidence where supported.
* Flag unreadable or uncertain values.
* Allow authorized users to review and correct extracted values.
* Keep extracted, institution-submitted, and independently verified values distinguishable.

**Acceptance criteria:**

* Supported test documents produce structured extraction results.
* Missing or uncertain fields are visibly identified.
* OCR output does not automatically establish authenticity.

### FR-06: Validation and Discrepancy Detection

* Check required fields.
* Validate date relationships.
* Compare institution-entered values with extracted values.
* Flag potential duplicate references.
* Identify missing supporting documents.
* Compare information against available authorized reference records.
* Record discrepancy details and resolution outcomes.
* Allow reviewers to distinguish automated warnings from confirmed findings.

**Acceptance criteria:**

* Seeded mismatches in test records trigger the expected warnings.
* Warnings identify the relevant fields and values.
* Reviewers can record the resolution.
* Automated rules do not independently declare an instrument fraudulent.

### FR-07: Verification and Scrutiny

* Provide a queue of cases requiring review.
* Display instrument details and supporting documents.
* Allow authorized officials to record observations.
* Support requests for additional information.
* Record the verification method, source, outcome, reviewer, and timestamp where applicable.
* Preserve the history of status changes.
* Distinguish institution-submitted information from independently confirmed information.

**Acceptance criteria:**

* Submitted records enter the configured review queue.
* Reviewers can request additional information.
* Institutions can respond through the portal.
* Verification outcomes are traceable to the responsible user and available evidence.

### FR-08: Maturity Monitoring

* Monitor maturity dates for applicable instruments.
* Calculate time remaining until maturity.
* Identify instruments within configured reminder windows.
* Identify matured instruments.
* Track unresolved required renewal or replacement actions.
* Support configurable reminder intervals.
* Prevent duplicate reminders for the same scheduled event.
* Record notification outcomes where available.

**Acceptance criteria:**

* Test instruments appear in the correct dashboard categories.
* Reminders are generated according to the configured rules.
* Maturity alone does not automatically imply noncompliance.
* Changes to instrument status are reflected in subsequent monitoring.

### FR-09: Renewal and Replacement

* Allow authorized users to submit replacement instrument information.
* Link a replacement to its predecessor.
* Preserve the previous record and supporting documents.
* Record the review outcome.
* Distinguish a submitted replacement from an accepted replacement.
* Identify the currently applicable instrument according to the configured workflow.

**Acceptance criteria:**

* Replacement relationships can be retrieved.
* Historical records remain available.
* A replacement is not automatically treated as accepted upon upload.

### FR-10: Release and Refund Requests

* Create requests with unique identifiers.
* Associate each request with the relevant institution and instrument.
* Capture required details and supporting documents.
* Provide a review queue.
* Allow authorized users to request additional information.
* Route requests to authorized decision-makers.
* Record decisions and reasons.
* Preserve request history.
* Notify relevant users about status changes.

**Acceptance criteria:**

* A submitted request appears in the appropriate queue.
* Unauthorized users cannot approve requests.
* Decisions are recorded in the audit history.
* The MVP does not independently transfer or refund money.

### FR-11: Notifications

* Generate notifications for relevant submissions, observations, status changes, deadlines, and decisions.
* Support in-app notifications.
* Support email notifications if configured and approved.
* Enforce recipient permissions.
* Track notification creation and delivery status where available.
* Retry eligible failures according to a defined policy.
* Avoid duplicate notifications for the same scheduled event.

**Acceptance criteria:**

* Configured events generate the expected notifications.
* Notifications are visible to their intended recipients.
* Failed delivery attempts are recorded where supported.

### FR-12: Dashboards and Reporting

* Display institution-specific metrics to institution users.
* Display authorized portfolio-level metrics to officials.
* Support filters by status, institution, and date where permitted.
* Provide access to underlying records from summary categories.
* Calculate metrics from the underlying database.
* Support approved report exports.
* Restrict report content to authorized data.
* Display the reporting period and generation timestamp.

**Acceptance criteria:**

* Dashboard totals match the test dataset.
* Filters return the expected records.
* Institution users cannot access other institutions' data through exports.

### FR-13: Audit Logging

* Record important submissions, changes, uploads, observations, verification outcomes, decisions, and permission changes.
* Include the actor, action, timestamp, and related record.
* Preserve previous and updated values where appropriate.
* Restrict access to audit information.
* Protect audit records from unauthorized alteration.
* Follow the approved retention policy.

**Acceptance criteria:**

* Authorized reviewers can reconstruct the history of a sample case.
* Important decisions are attributable to the responsible user.
* Ordinary users cannot alter or delete audit events.

---

## 8. Pages and Screens

### 8.1 Public and Authentication Screens

| Screen           | Purpose                          | Primary Elements                                                                           |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| Login            | Authenticate users               | Email or approved identifier, password or configured authentication method, error feedback |
| Account Recovery | Restore account access           | Recovery instructions and confirmation                                                     |
| Access Denied    | Explain insufficient permissions | Error message and navigation back to an authorized page                                    |

Public self-registration should not be assumed. Institution onboarding may require administrative provisioning or an approved verification process.

### 8.2 Institution Portal

| Screen                  | Purpose                                              | Primary Elements                                                         |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Institution Dashboard   | Show the institution's records and pending actions   | Summary cards, upcoming deadlines, pending submissions, request statuses |
| FDR List                | Browse institution instruments                       | Search, filters, status, amount, maturity date                           |
| Add/Edit FDR            | Submit or update permitted details                   | Instrument form, validation, save draft, upload documents                |
| FDR Details             | View a single instrument                             | Instrument information, documents, status, history                       |
| Document Review         | Review uploaded and extracted information            | Original document, extracted fields, discrepancy warnings                |
| Respond to Observation  | Provide requested information                        | Observation details, response form, document upload                      |
| Renewal/Replacement     | Submit a new instrument linked to an existing record | Previous instrument, new instrument form, document upload                |
| Release/Refund Requests | Track requests                                       | Request list, status, submission date                                    |
| New Release Request     | Create an applicable request                         | Request details, supporting documents, submission confirmation           |
| Notifications           | View alerts and status updates                       | Notification list, timestamps, read status                               |
| Profile                 | View authorized account information                  | User details and permitted profile settings                              |

### 8.3 AICTE Administration Portal

| Screen                   | Purpose                                        | Primary Elements                                                              |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Administration Dashboard | Show portfolio-wide status                     | Instrument totals, upcoming maturity, pending cases, unresolved discrepancies |
| Institution Management   | Browse institution records                     | Search, institution details, account status                                   |
| FDR Management           | Search and review instruments                  | Filters, status, maturity dates, institution                                  |
| FDR Details              | Review an instrument                           | Structured fields, document history, verification history                     |
| Scrutiny Queue           | Identify records awaiting review               | Priority indicators, submission date, assigned reviewer                       |
| Verification Workspace   | Review documents and findings                  | Document viewer, extracted fields, discrepancies, observations                |
| Renewal Tracking         | Monitor replacement instruments                | Previous/current relationships, status, relevant dates                        |
| Release/Refund Queue     | Review requests                                | Request details, supporting evidence, current stage                           |
| Request Review           | Record administrative decisions                | Scrutiny observations, decision form, decision reason                         |
| Reports                  | Generate management summaries                  | Filters, reporting period, authorized export                                  |
| User and Role Management | Manage accounts and permissions                | User list, role assignment, account status                                    |
| Workflow Settings        | Configure approved reminder and workflow rules | Reminder intervals, notification settings, workflow parameters                |
| Audit Log                | Review important actions                       | Actor, action, timestamp, record reference                                    |

### 8.4 Shared Interface Requirements

* Provide consistent navigation based on the user's role.
* Clearly distinguish statuses and required actions.
* Display loading feedback during asynchronous operations.
* Confirm successful submissions and updates.
* Explain validation errors next to relevant fields.
* Prevent accidental loss of unsaved form data where practical.
* Use responsive layouts for common desktop and mobile browser sizes.
* Avoid exposing sensitive financial information in page URLs or unnecessary notifications.

---

## 9. Roles and Permissions

The backend must enforce the following permission boundaries.

| Capability                      | Institution Representative | Scrutiny Officer                      | Approving Authority            | System Administrator          |
| ------------------------------- | -------------------------- | ------------------------------------- | ------------------------------ | ----------------------------- |
| View own institution records    | Yes                        | According to authorization            | According to authorization     | Only as permitted by policy   |
| View other institution records  | No                         | According to assignment and authority | According to authority         | Only as permitted by policy   |
| Create FDR submission           | Yes                        | Only if explicitly authorized         | Only if explicitly authorized  | Only if explicitly authorized |
| Edit submitted institution data | Own permitted records      | Permitted workflow fields             | Permitted workflow fields      | Configuration-dependent       |
| Upload supporting documents     | Own permitted cases        | Authorized cases                      | Authorized cases               | Only if explicitly authorized |
| Review scrutiny cases           | No                         | Yes                                   | Where relevant to approval     | No by default                 |
| Record scrutiny observations    | No                         | Yes                                   | Where relevant to authority    | No by default                 |
| Record verification outcome     | No                         | If explicitly authorized              | If explicitly authorized       | No by default                 |
| Submit renewal/replacement      | Own permitted records      | No by default                         | No by default                  | No by default                 |
| Review replacement              | No                         | Yes                                   | Where required                 | No by default                 |
| Submit release/refund request   | Own eligible records       | No by default                         | No by default                  | No by default                 |
| Approve release/refund          | No                         | Only if explicitly authorized         | Yes, within assigned authority | No by default                 |
| Configure reminders             | No                         | No                                    | No                             | Yes                           |
| Manage users and roles          | No                         | No                                    | No by default                  | Yes                           |
| View audit history              | Own relevant history       | Authorized cases                      | Authorized cases               | According to policy           |
| Export reports                  | Own permitted records      | Authorized reports                    | Authorized reports             | According to policy           |

All sensitive actions must be checked against the user's current permissions and, where applicable, the case's workflow state.

---

## 10. Data Requirements

### 10.1 Institution

Minimum proposed fields:

* `institution_id`
* `institution_name`
* `institution_code`, where applicable
* `institution_type`
* `address`
* `authorized_contact`
* `contact_email`
* `contact_phone`
* `account_status`
* `created_at`
* `updated_at`

Institution identifiers must follow the approved source of truth. The system must not invent official identifiers.

### 10.2 User

Minimum proposed fields:

* `user_id`
* `name`
* `email`
* `role`
* `institution_id`, where applicable
* `account_status`
* `created_at`
* `last_login_at`

Authentication secrets must be managed by an appropriate authentication service and must not be stored as plaintext.

### 10.3 Financial Instrument

Minimum proposed fields:

* `instrument_id`
* `institution_id`
* `instrument_reference_number`
* `instrument_type`
* `issuing_bank`
* `branch_name`
* `amount`
* `currency`
* `issue_date`
* `maturity_date`
* `administrative_status`
* `verification_status`
* `validity_status`, where applicable
* `document_id`
* `predecessor_instrument_id`, where applicable
* `created_at`
* `updated_at`

The schema must distinguish between:

* Institution-submitted values.
* OCR-extracted values.
* Reviewer-corrected values.
* Independently confirmed values.

Where those values differ, the system must preserve the source and relevant history.

### 10.4 Document

Proposed fields:

* `document_id`
* `instrument_id`, where applicable
* `request_id`, where applicable
* `document_type`
* `storage_reference`
* `original_filename`
* `content_type`
* `file_size`
* `document_version`
* `uploaded_by`
* `uploaded_at`
* `integrity_hash`
* `review_status`

The database should store document metadata and secure storage references. Large document files should reside in private document storage.

### 10.5 Verification Record

Proposed fields:

* `verification_id`
* `instrument_id`
* `verification_method`
* `verification_source`
* `reviewer_id`
* `verification_outcome`
* `observations`
* `verified_at`
* `evidence_reference`

Verification source must distinguish manual review, document-based checks, and independent confirmation where available.

### 10.6 Release/Refund Request

Proposed fields:

* `request_id`
* `institution_id`
* `instrument_id`
* `request_type`
* `submission_date`
* `request_status`
* `assigned_reviewer`
* `decision`
* `decision_reason`
* `decision_maker`
* `decision_timestamp`

### 10.7 Notification

Proposed fields:

* `notification_id`
* `recipient_user_id`
* `related_record_id`
* `notification_type`
* `message`
* `scheduled_at`
* `sent_at`
* `delivery_status`
* `read_status`

### 10.8 Audit Event

Proposed fields:

* `audit_event_id`
* `actor_user_id`
* `action_type`
* `entity_type`
* `entity_id`
* `previous_value_reference`
* `updated_value_reference`
* `timestamp`
* `outcome`
* `request_correlation_id`

### 10.9 Data Integrity Rules

* Every instrument must reference a valid institution.
* Every uploaded document must have a valid record association.
* Every release/refund request must reference an applicable instrument and institution.
* A replacement instrument may reference a predecessor instrument.
* The system must prevent invalid replacement relationships and unintended circular references.
* Financial amounts must be stored using a suitable decimal representation.
* Dates must use a consistent format and timezone policy.
* Important status transitions must be validated by the backend.
* Historical records must not be silently overwritten.
* Audit records must be protected against unauthorized modification.

---

## 11. Status Definitions

Status labels must represent distinct concepts rather than combining verification, validity, and administrative processing into one field.

### 11.1 Submission Status

Proposed values:

* Draft
* Submitted
* Under Review
* Additional Information Required
* Review Completed
* Closed

### 11.2 Verification Status

Proposed values:

* Not Started
* Pending
* Discrepancy Detected
* Independently Confirmed
* Unable to Verify
* Further Review Required

The exact final status vocabulary requires stakeholder approval.

### 11.3 Instrument Lifecycle Status

Proposed values:

* Active
* Approaching Maturity
* Matured
* Replaced
* Released
* Closed

These statuses should be derived or updated according to the approved workflow. They must not be used as substitutes for a separate verification result.

### 11.4 Release/Refund Request Status

Proposed values:

* Draft
* Submitted
* Under Scrutiny
* Additional Information Required
* Pending Approval
* Approved
* Rejected
* Closed

The exact request lifecycle must follow the approved administrative procedure.

---

## 12. Integrations

### 12.1 Authentication Provider

**Purpose:** Authenticate users and support secure account management.

**MVP:** Use an established authentication mechanism appropriate to the deployment environment.

**Requirements:**

* Secure authentication.
* Role and institution association.
* Session management.
* Account recovery where permitted.

**Dependency:** The identity and account provisioning model must be approved.

### 12.2 OCR Engine

**Purpose:** Extract structured information from supported FDR documents.

**MVP:** Use a locally deployable or otherwise approved OCR engine.

**Requirements:**

* Support the selected document formats.
* Return extracted text and supported fields.
* Handle unreadable documents gracefully.
* Preserve the source document reference.
* Allow manual review and correction.

OCR is an extraction aid, not an independent financial verification service.

### 12.3 Notification Service

**Purpose:** Deliver reminders and workflow notifications.

**MVP:** In-app notifications.

**Optional:** Email delivery through an approved service.

**Requirements:**

* Configurable templates and events.
* Delivery status tracking where supported.
* Retry handling.
* Appropriate recipient authorization.

### 12.4 Bank Verification Service

**Purpose:** Independently confirm financial instrument details where supported.

**Status:** Not confirmed for MVP.

Before integration, establish:

* Availability of an official interface.
* Authorization and access credentials.
* Permitted data exchange.
* Verification response format.
* Failure handling.
* Audit requirements.

Until then, officials must be able to record a manual verification outcome and its source.

### 12.5 Existing AICTE Systems

**Purpose:** Avoid duplicate data entry and support authorized information exchange.

**Status:** Requires investigation and approval.

The MVP should use clear API boundaries so integration can be added later without redesigning the entire application.

No live integration should be represented as functional unless it has been implemented and tested.

---

## 13. Loading, Empty, Error, and Success States

Every primary screen must handle normal and exceptional states explicitly.

### 13.1 Loading States

| Context              | Required Behavior                                               |
| -------------------- | --------------------------------------------------------------- |
| Dashboard loading    | Show loading indicators for summary cards and lists             |
| FDR list loading     | Display a list-level loading state                              |
| FDR details loading  | Show a placeholder until record details are available           |
| Document upload      | Display upload progress where available                         |
| OCR processing       | Show processing status and prevent duplicate processing actions |
| Form submission      | Disable duplicate submission and show progress                  |
| Report generation    | Display progress and prevent duplicate generation requests      |
| Notification loading | Show a loading state until notifications are available          |

Loading indicators must not imply that an operation has succeeded before the server confirms success.

### 13.2 Empty States

| Context              | Required Behavior                                                                       |
| -------------------- | --------------------------------------------------------------------------------------- |
| No FDR records       | Explain that no instruments have been added and provide an authorized submission action |
| No search results    | Explain that no records match the current filters and provide a way to clear filters    |
| No pending scrutiny  | Display a clear message that there are no pending cases                                 |
| No upcoming maturity | Explain that no instruments currently match the configured monitoring window            |
| No release requests  | Explain that no requests have been submitted                                            |
| No notifications     | Display a simple empty notification state                                               |
| No audit results     | Explain that no events match the selected filters                                       |

Empty states should distinguish between a genuinely empty dataset and a failed request.

### 13.3 Error States

| Error                     | Required Behavior                                                             |
| ------------------------- | ----------------------------------------------------------------------------- |
| Invalid form data         | Identify the field and explain the correction                                 |
| Unauthorized access       | Deny access without revealing restricted information                          |
| Record not found          | Display a clear not-found message                                             |
| Upload failure            | Explain the failure and allow a safe retry                                    |
| Unsupported document      | Explain the supported file requirements                                       |
| OCR failure               | Preserve the uploaded document and allow manual entry or retry                |
| Database/API failure      | Display a recoverable error without exposing internal details                 |
| Notification failure      | Record the failure and retry according to policy                              |
| Session expiration        | Request reauthentication and preserve unsaved data where practical            |
| Concurrent update         | Inform the user that the record changed and require review before overwriting |
| Duplicate submission      | Prevent duplicate creation where the request can be identified reliably       |
| Report generation failure | Display the failure and provide a retry option where appropriate              |

Error messages must not expose database queries, credentials, stack traces, private storage references, or other internal implementation details.

### 13.4 Success States

The application must confirm important successful actions, including:

* FDR submitted.
* Document uploaded.
* Additional information submitted.
* Verification outcome recorded.
* Replacement instrument submitted.
* Release/refund request submitted.
* Administrative decision recorded.
* Report generated.

Where applicable, success messages should include the record or request reference and the next expected action.

---

## 14. Non-Functional Requirements

### 14.1 Security

* Use HTTPS in deployed environments.
* Enforce backend authorization for all protected operations.
* Restrict access to financial documents.
* Apply encryption at rest where supported and required.
* Use secure session and credential management.
* Validate file uploads and permitted formats.
* Apply file scanning where supported.
* Prevent unauthorized access through manipulated identifiers.
* Protect audit logs from unauthorized changes.
* Keep secrets out of source control and client-side code.
* Follow applicable organizational and government security requirements.

### 14.2 Privacy

* Collect only information necessary for the product's purpose.
* Restrict financial and institutional information to authorized users.
* Establish appropriate retention and deletion rules.
* Avoid exposing sensitive values in unnecessary notifications or logs.
* Use synthetic or authorized data for development and demonstrations.

### 14.3 Performance

Initial targets, subject to validation:

* Common dashboard queries should typically respond within two seconds under the agreed test workload.
* Standard instrument searches should typically respond within two seconds under the agreed test workload.
* Document uploads should provide progress feedback where supported.
* OCR should execute asynchronously when processing would otherwise block the interface.
* Scheduled monitoring must process eligible records within its configured execution window.

These targets are proposed engineering goals, not verified production performance.

### 14.4 Reliability

* Failed OCR processing must not destroy the uploaded document.
* Important database updates must preserve consistency.
* Scheduled jobs must recover from temporary failures.
* Notification retries must avoid duplicate successful delivery where practical.
* Backups and restoration procedures must be established for production deployment.

### 14.5 Accessibility and Usability

* Use clear form labels and validation messages.
* Support keyboard navigation for primary workflows.
* Provide adequate contrast and readable typography.
* Do not rely exclusively on color to communicate status.
* Use consistent date and currency formatting.
* Ensure that common workflows work on supported desktop and mobile browsers.

### 14.6 Maintainability

* Separate interface, business logic, persistence, and integration responsibilities.
* Use documented APIs and consistent error responses.
* Keep reminder intervals and workflow rules configurable.
* Include automated tests for important authorization and lifecycle behavior.
* Maintain deployment and configuration documentation.

### 14.7 Scalability

The system should support growth in institutions, instruments, users, and stored documents without requiring a complete architectural redesign.

Exact capacity requirements must be established after expected usage and retention needs are confirmed.

---

## 15. MVP Scope

The MVP should demonstrate the complete lifecycle of an FDR record using a manageable feature set.

### 15.1 Must Have

* Secure login.
* Role-based authorization.
* Institution records.
* FDR registration.
* Secure document uploads.
* FDR details and history.
* OCR-assisted extraction for supported documents.
* Field validation and discrepancy warnings.
* Official scrutiny workflow.
* Maturity monitoring.
* Configurable reminders.
* Renewal and replacement tracking.
* Release/refund request tracking.
* Role-specific dashboards.
* Audit logging.
* Search and filtering.
* Synthetic demonstration data.
* Automated tests for important workflows.

### 15.2 Should Have

* In-app notifications.
* Email notifications if available and approved.
* Report export.
* OCR confidence indicators.
* Document version history.
* Retry handling for background tasks.
* Advanced dashboard filters.

### 15.3 Could Have

* Authorized bank verification integration.
* Authorized AICTE system integration.
* Bulk record migration.
* Advanced analytics.
* Additional notification channels.

### 15.4 Won't Have in the MVP

* Native mobile applications.
* Blockchain.
* Predictive machine learning without a validated use case.
* Direct financial transfers.
* Autonomous release approval.
* Unverified claims of official bank or AICTE connectivity.

---

## 16. Out-of-Scope Dependencies

The following require organizational input beyond ordinary application development:

* Final confirmation of applicable financial and regulatory requirements.
* Official institution onboarding procedures.
* Actual bank verification interfaces and authorization.
* Existing AICTE system API documentation and access.
* Production identity and account provisioning arrangements.
* Official release and refund approval rules.
* Approved data retention and security policies.
* Production deployment approval.

The MVP may demonstrate provisional workflows using synthetic data, but these must not be presented as confirmed official procedures.

---

## 17. Success Criteria

Success must be demonstrated through measurable tests rather than unsupported claims.

### 17.1 Functional Success

The MVP is successful when:

1. An institution can submit an FDR and supporting document.
2. An authorized official can review the submission.
3. The system can extract supported fields from selected test documents.
4. Seeded discrepancies trigger the expected warnings.
5. Instruments approaching configured maturity dates appear in the correct dashboard category.
6. Scheduled test reminders are generated as expected.
7. A replacement instrument can be linked to its predecessor.
8. A release/refund request can complete the configured administrative workflow.
9. Important actions appear in the audit history.
10. Unauthorized users cannot access restricted institution records or perform protected actions.
11. Dashboard figures match the underlying test dataset.

### 17.2 Efficiency Metrics

| Metric                       | Measurement                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| Data-entry effort            | Compare manual entry time with OCR-assisted entry time                                   |
| Extraction accuracy          | Correct extracted fields divided by evaluated fields                                     |
| Discrepancy detection rate   | Correctly flagged seeded discrepancies divided by all seeded discrepancies               |
| False-positive rate          | Incorrect discrepancy warnings divided by evaluated non-discrepant cases                 |
| Reminder reliability         | Correctly generated scheduled reminders divided by expected reminders                    |
| Workflow turnaround time     | Elapsed time between submission and the recorded review outcome                          |
| Audit completeness           | Required test actions recorded divided by required test actions performed                |
| Access-control effectiveness | Unauthorized access scenarios correctly blocked divided by unauthorized scenarios tested |

The team must document the test dataset, sample size, testing conditions, and observed results.

### 17.3 Initial Performance Targets

The team should establish baseline measurements before claiming improvements.

Provisional goals:

* All defined critical workflow tests pass.
* All defined unauthorized-access tests are blocked.
* All deliberately seeded mandatory-field and date-validation errors are identified by their corresponding rules.
* All scheduled reminder scenarios behave according to their test configuration.
* Dashboard totals match the test dataset.
* Important workflow decisions have attributable audit records.

OCR accuracy and processing-time improvement targets must be set after evaluating representative documents.

---

## 18. Testing Strategy

### 18.1 Functional Testing

Test:

* Institution creation and access.
* FDR submission.
* Document upload and retrieval.
* OCR extraction.
* Validation and discrepancy detection.
* Verification and scrutiny.
* Maturity monitoring.
* Renewal and replacement.
* Release/refund requests.
* Notifications.
* Reports and audit history.

### 18.2 Authorization Testing

Verify that:

* Institution users cannot access another institution's data.
* Officials cannot access records outside their authorization.
* Only authorized roles can approve requests.
* Administrative permissions do not automatically grant financial approval authority.
* Restricted documents cannot be retrieved without authorization.

### 18.3 Data Integrity Testing

Verify that:

* Duplicate identifiers are handled appropriately.
* Invalid date relationships are rejected or flagged.
* Replacement relationships are valid.
* Historical records remain available.
* Failed operations do not leave inconsistent workflow states.
* Concurrent updates do not silently overwrite changes.

### 18.4 Automation Testing

Use controlled test data to verify:

* OCR field extraction.
* Low-confidence extraction handling.
* Seeded discrepancy detection.
* Reminder scheduling.
* Duplicate notification prevention.
* Failed-job retry behavior.

### 18.5 User Acceptance Testing

Have representative users evaluate:

* Ease of FDR submission.
* Clarity of verification feedback.
* Visibility into pending actions.
* Ease of locating instrument history.
* Clarity of maturity reminders.
* Transparency of release/refund request status.

---

## 19. Proposed Technical Architecture

The MVP should use a straightforward web application architecture.

### Frontend

**Proposed:** React with TypeScript.

Responsibilities:

* Institution portal.
* Administration dashboard.
* Forms and validation feedback.
* Document review interface.
* Request tracking.
* Notifications and reports.

### Backend

**Proposed:** Python with FastAPI.

Responsibilities:

* Business rules.
* Authentication integration.
* Authorization.
* FDR lifecycle management.
* Document processing.
* Verification workflows.
* Maturity monitoring.
* Notifications.
* Audit logging.
* Reporting APIs.

### Database

**Proposed:** PostgreSQL.

Responsibilities:

* Institution records.
* User and role associations.
* Instrument records.
* Verification history.
* Release/refund requests.
* Notifications.
* Audit metadata.

### Document Storage

Use private object storage or an equivalent protected document repository.

The application must enforce authorization before issuing or serving document access.

### OCR

**Proposed:** Tesseract OCR, with PDF text extraction and image preprocessing where needed.

### Scheduled Processing

Use a reliable scheduler or background job mechanism for:

* Maturity checks.
* Reminder generation.
* Retryable notification jobs.
* Identification of unresolved deadline-related actions.

### Architecture Boundaries

The system should separate:

* User interface.
* Business logic.
* Database access.
* Document storage.
* OCR processing.
* Scheduled tasks.
* External integrations.

The initial deployment should remain simple. Separate microservices are not required for the MVP.

The final technology stack and hosting environment require team and stakeholder confirmation.

---

## 20. Risks and Mitigations

| Risk                                                    | Impact                                       | Mitigation                                                                  |
| ------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| OCR extracts incorrect financial information            | Incorrect records or unnecessary scrutiny    | Preserve the original document, allow correction, and flag uncertain values |
| Bank verification access is unavailable                 | Independent verification cannot be automated | Provide an auditable manual verification workflow                           |
| Official workflow differs from the proposed model       | Incorrect routing or statuses                | Validate procedures before production and keep workflows configurable       |
| Reminder rules are incorrect                            | Missed or misleading notifications           | Require approved rules and test configured deadlines                        |
| Unauthorized access exposes financial information       | Privacy and security incident                | Enforce backend permissions and private document storage                    |
| Replacement overwrites historical information           | Loss of traceability                         | Maintain linked records and document versions                               |
| Notifications fail                                      | Users may miss required actions              | Track failures and implement controlled retries                             |
| Automated warnings are misinterpreted as fraud findings | Unfair or incorrect administrative decisions | Label automated results as warnings requiring authorized review             |
| Imported records contain errors                         | Inaccurate dashboard and monitoring results  | Validate imported data and flag uncertain records                           |
| Project scope expands excessively                       | Incomplete prototype                         | Prioritize the defined MVP and defer optional integrations                  |

---

## 21. Delivery Milestones

The following milestones are proposed planning stages rather than fixed calendar commitments.

### Milestone 1: Requirements and Workflow Confirmation

* Confirm user roles.
* Validate core administrative workflows.
* Finalize mandatory instrument fields.
* Define the initial status model.
* Confirm MVP scope.

### Milestone 2: Foundation

* Establish the application structure.
* Implement authentication and authorization.
* Create the database schema.
* Implement institution and FDR records.
* Implement document uploads.

### Milestone 3: Review Workflow

* Implement the official scrutiny queue.
* Build the document review interface.
* Add discrepancy records and observations.
* Implement status history and audit logging.

### Milestone 4: Smart Automation

* Add OCR extraction.
* Implement field validation.
* Add maturity monitoring.
* Implement reminders and notifications.
* Add renewal and replacement tracking.

### Milestone 5: Administrative Processing

* Implement release/refund request management.
* Add role-specific dashboards.
* Implement search, filtering, and reports.

### Milestone 6: Testing and Demonstration

* Run functional tests.
* Run authorization tests.
* Validate reminders and discrepancy detection.
* Populate synthetic demonstration records.
* Verify dashboard calculations.
* Prepare the end-to-end demonstration.

---

## 22. Definition of Done

A feature is considered complete when:

* Its stated functional requirements are implemented.
* The backend enforces the relevant permissions.
* Loading, empty, error, and success states are handled.
* Relevant data is stored consistently.
* Important actions are audited.
* Appropriate tests pass.
* Sensitive information is not exposed through unauthorized access.
* The feature is documented sufficiently for another developer to maintain it.

The MVP is considered ready for demonstration when all critical user journeys work end to end using authorized test data.

---

## 23. Final Product Definition

FDR-SMART is a centralized web portal for managing the administrative lifecycle of security deposits and FDRs associated with applicable AICTE approval-related processes.

The product combines institution-wise record management, secure document handling, OCR-assisted extraction, discrepancy detection, maturity monitoring, renewal tracking, release/refund workflows, dashboards, and audit logging.

Its primary objective is to make financial instrument records easier to maintain, review, monitor, and trace.

The MVP will prioritize reliable administrative workflows and measurable automation over unnecessary technical complexity.

**The product must help authorized users make better-informed and more timely decisions without replacing the verification, regulatory compliance, or financial authorization procedures required by AICTE.**

---

## 24. Source of Truth and Change Control

This document defines the proposed product requirements for the initial implementation.

When a requirement is unclear:

1. Follow the explicitly stated requirements in this document.
2. Do not invent regulatory rules, external API behavior, approval permissions, or financial procedures.
3. Prefer configurable behavior where the requirement is expected to vary.
4. Preserve data integrity and authorization boundaries.
5. Record unresolved decisions for stakeholder approval.
6. Update this document when an approved product decision changes expected behavior.

The implementation must not claim a capability is operational unless it has been implemented and verified.

**Document status:** Proposed PRD for MVP implementation. Regulatory workflow details, production security requirements, and external integrations remain subject to validation and approval.

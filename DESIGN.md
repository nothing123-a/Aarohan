# DESIGN.md — FDR-SMART Design System

**Product:** AICTE Security Deposit/FDR Management Portal
**Problem Statement ID:** SIH 26265
**Organization:** All India Council for Technical Education (AICTE)
**Department:** Regulation Bureau
**Document Version:** 1.0
**Status:** Proposed Design Specification
**Source of Truth:** PRD.md

---

## 1. Design Vision

FDR-SMART is an administrative application for managing financial instruments, institutional records, verification workflows, maturity deadlines, and release or refund requests.

The interface must feel like a dependable government administrative system: structured, restrained, precise, and easy to navigate.

The design should help users answer three questions quickly:

1. **What is the current status of this record?**
2. **What action is required next?**
3. **Where can I find the supporting information or decision history?**

The interface should prioritize information clarity, operational efficiency, and trustworthy presentation over visual novelty.

### 1.1 Design Personality

The product should feel:

* **Professional:** Suitable for financial and regulatory administration.
* **Clear:** Information hierarchy makes important details easy to identify.
* **Structured:** Records, forms, tables, and workflows follow consistent patterns.
* **Restrained:** Color and decoration are used purposefully.
* **Transparent:** Statuses, validation results, and administrative decisions are visible.
* **Accessible:** Users can operate the application without relying exclusively on color, precise pointer movements, or visual cues.

### 1.2 Visual Direction

Use a light, neutral interface with a deep navy navigation system, white content surfaces, subtle borders, and a limited blue accent palette.

The design should resemble a well-designed administrative workbench rather than a marketing website.

The primary visual elements are:

* A persistent application shell.
* A clear page title and contextual actions.
* Compact summary cards for important metrics.
* Information-dense but readable tables.
* Structured forms with explicit labels.
* Clearly differentiated workflow statuses.
* Side panels or dedicated detail pages for reviewing records.
* Consistent feedback for system actions.

### 1.3 Design Principles

#### Principle 1: Information Before Decoration

Every element must support a task, communicate information, or establish hierarchy.

Avoid decorative illustrations, excessive gradients, oversized headings, and unnecessary visual effects.

#### Principle 2: Make Status Immediately Understandable

Users should not need to open every record to determine whether it is pending, under review, approaching maturity, or awaiting approval.

Status labels must be explicit and consistent throughout the application.

#### Principle 3: Prioritize Frequent Administrative Tasks

Common tasks should be easy to locate:

* Find an FDR.
* Submit an instrument.
* Review a pending case.
* Resolve a discrepancy.
* Identify an upcoming deadline.
* Track a release or refund request.

#### Principle 4: Preserve Context

When reviewing a document, the user should be able to see its associated institution, instrument reference, and current workflow status.

When possible, actions should not force users to navigate through multiple unrelated pages.

#### Principle 5: Make Errors Recoverable

Validation failures, upload errors, and OCR failures should explain what happened and what the user can do next.

Never discard a user's work unnecessarily.

#### Principle 6: Distinguish Automation from Official Decisions

Automated checks must be presented as system-generated findings, not as official verification decisions.

OCR extraction, discrepancy warnings, and independent bank confirmation must remain visually and semantically distinct.

#### Principle 7: Use Consistent Patterns

A button, form field, status label, or confirmation dialog should behave consistently wherever it appears.

New patterns should only be introduced when an existing pattern cannot adequately support the task.

---

# 2. Application Shell and Navigation

## 2.1 Overall Layout

The authenticated application uses three primary layout regions:

1. **Sidebar:** Main navigation.
2. **Top bar:** Page context and account controls.
3. **Main content:** Page-specific information and actions.

The layout should support dense administrative workflows without making the interface feel crowded.

### Desktop Layout

* Fixed-width or collapsible left sidebar.
* Full-width top bar aligned with the content region.
* Main content with a consistent maximum width for forms and detail pages.
* Wide content area for dashboards and data tables.
* Optional right-side panel for contextual details where appropriate.

Recommended dimensions:

| Element                         | Specification           |
| ------------------------------- | ----------------------- |
| Expanded sidebar                | 248 px                  |
| Collapsed sidebar               | 72 px                   |
| Top bar height                  | 64 px                   |
| Main content horizontal padding | 32 px                   |
| Main content vertical padding   | 28–32 px                |
| Maximum form width              | 960 px                  |
| Maximum standard detail width   | 1120 px                 |
| Wide dashboard/table width      | Available content width |
| Optional right panel            | 320–400 px              |

These are initial design tokens, not immutable dimensions. The layout must remain usable at smaller viewport widths.

## 2.2 Sidebar Navigation

The sidebar contains the application identity, primary navigation, and account-level actions.

### Institution Representative Navigation

1. Dashboard
2. My FDRs
3. Submit New FDR
4. Renewals & Replacements
5. Release/Refund Requests
6. Notifications

The profile and logout actions appear in the lower sidebar or account menu.

### Scrutiny Officer Navigation

1. Dashboard
2. Verification Queue
3. All Authorized FDR Records
4. Maturity Monitoring
5. Renewal Tracking
6. Release/Refund Requests
7. Reports

### Approving Authority Navigation

1. Dashboard
2. Pending Approvals
3. Authorized FDR Records
4. Release/Refund Requests
5. Maturity Monitoring
6. Reports

### System Administrator Navigation

1. Dashboard
2. User Management
3. Institution Management
4. Workflow Settings
5. Notification Settings
6. Audit Logs

Administrative navigation must be limited to functions authorized for the current user.

### Navigation Rules

* Display only the navigation items relevant to the user's role.
* Use text labels alongside icons in the expanded sidebar.
* Highlight the active destination with a restrained background and accent indicator.
* Use icons from one consistent icon library.
* Avoid ambiguous icons without text labels.
* Keep destructive or security-sensitive actions out of primary navigation.
* Preserve navigation state when the sidebar is collapsed.
* Use accessible labels for icon-only controls.

### Mobile Navigation

On narrow screens:

* Replace the persistent sidebar with a navigation drawer.
* Provide a visible menu button.
* Close the drawer after a destination is selected.
* Keep page titles and primary actions easy to reach.
* Do not allow the navigation drawer to obscure essential form feedback.

## 2.3 Top Bar

The top bar should include:

* Breadcrumbs where they improve orientation.
* Current page title when not already prominent in the content header.
* Notification access.
* User profile and account menu.
* Optional contextual actions when appropriate.

Avoid duplicating the page title in both the top bar and the content header.

### Account Menu

The account menu may contain:

* User name.
* Assigned role.
* Institution name, when applicable.
* Profile settings.
* Sign out.

Do not display sensitive financial information in the top bar.

---

# 3. Color System

The color palette should communicate hierarchy, status, and action without making the interface visually noisy.

Use neutral surfaces as the foundation, deep navy for application structure, blue for primary actions, and semantic colors for status feedback.

## 3.1 Core Palette

| Token              | Hex       | Intended Use                                      |
| ------------------ | --------- | ------------------------------------------------- |
| Primary Navy       | `#16324F` | Sidebar, strong headings, selected navigation     |
| Primary Blue       | `#2457C5` | Primary buttons, links, active controls           |
| Primary Blue Hover | `#1D46A3` | Hover state for primary actions                   |
| Primary Blue Light | `#EAF1FF` | Selected backgrounds and informational highlights |
| Page Background    | `#F5F7FA` | Main application background                       |
| Surface            | `#FFFFFF` | Cards, forms, tables, dialogs                     |
| Surface Muted      | `#F8FAFC` | Secondary surfaces and table headers              |
| Border             | `#DCE3EC` | Dividers, field borders, card outlines            |
| Border Strong      | `#B8C5D6` | Emphasized boundaries                             |
| Text Primary       | `#172B4D` | Primary content and headings                      |
| Text Secondary     | `#52627A` | Descriptions and supporting information           |
| Text Muted         | `#68778D` | Secondary metadata                                |
| Text Inverse       | `#FFFFFF` | Text on dark surfaces                             |
| Focus Ring         | `#4B83F5` | Keyboard focus indicator                          |

## 3.2 Semantic Colors

Semantic colors communicate state and feedback. They must always be paired with meaningful text or an appropriate icon.

| Semantic Token | Foreground | Background | Intended Meaning                                |
| -------------- | ---------- | ---------- | ----------------------------------------------- |
| Success        | `#176B43`  | `#E8F6EE`  | Successful completion or confirmed action       |
| Warning        | `#8A5200`  | `#FFF3D6`  | Upcoming deadline or action requiring attention |
| Error          | `#B42318`  | `#FDECEC`  | Validation failure or unsuccessful action       |
| Information    | `#2457C5`  | `#EAF1FF`  | Informational message or system guidance        |
| Neutral        | `#52627A`  | `#EEF2F6`  | Draft, inactive state, or neutral information   |

Use these combinations as initial design tokens. Verify text and control contrast before implementation.

## 3.3 Color Usage Rules

### Primary Actions

Use primary blue for:

* Submit FDR.
* Save changes.
* Submit a request.
* Record an authorized decision.
* Confirm a non-destructive workflow action.

Use one visually dominant primary action per page or clearly defined action group.

### Secondary Actions

Use neutral or outlined buttons for:

* Cancel.
* Back.
* View details.
* Download.
* Edit permitted fields.

### Destructive Actions

Use semantic error styling for destructive actions such as removing an eligible draft or performing an irreversible administrative operation.

Require confirmation when an action could cause data loss or materially affect a case.

Do not style ordinary rejection or review actions as destructive unless their actual consequences justify it.

### Status Colors

Color indicates the category of status, not the entire meaning.

For example:

* Green with **Independently Confirmed**.
* Amber with **Approaching Maturity**.
* Red with **Overdue Action** or **Validation Error**.
* Blue with **Under Review**.
* Neutral with **Draft**.

An instrument's maturity state must not be confused with its verification status.

---

# 4. Typography

## 4.1 Font Family

Use **Inter** as the primary interface typeface, with a system sans-serif fallback.

Inter is suitable for administrative interfaces because of its readable forms and consistent appearance across headings, labels, numbers, and tables.

The implementation should avoid loading multiple unnecessary font families.

## 4.2 Type Scale

| Token              |  Size | Weight | Line Height | Usage                                          |
| ------------------ | ----: | -----: | ----------: | ---------------------------------------------- |
| Display            | 32 px |    600 |       40 px | Reserved for rare high-level overview contexts |
| Page Heading       | 24 px |    600 |       32 px | Main page title                                |
| Section Heading    | 18 px |    600 |       26 px | Major page sections                            |
| Subsection Heading | 16 px |    600 |       24 px | Form groups and card headings                  |
| Body               | 14 px |    400 |       21 px | Standard content                               |
| Body Emphasis      | 14 px |    500 |       21 px | Emphasized values and labels                   |
| Small              | 13 px |    400 |       19 px | Metadata and supporting text                   |
| Caption            | 12 px |    400 |       16 px | Secondary metadata and timestamps              |
| Button             | 14 px |    500 |       20 px | Button labels                                  |
| Table Header       | 12 px |    600 |       18 px | Column headings                                |

Avoid using display-sized typography for ordinary administrative pages.

## 4.3 Typography Rules

* Use sentence case for headings and navigation.
* Use concise labels that describe the field or action.
* Avoid long paragraphs inside dense data tables.
* Use tabular numerals for financial amounts, identifiers, and aligned numerical values where supported.
* Keep line lengths comfortable for longer descriptions.
* Avoid all-uppercase text except for limited, conventional abbreviations.
* Do not communicate hierarchy through font weight alone; use size and spacing consistently.
* Use readable line spacing for validation messages and document notes.

## 4.4 Financial and Date Formatting

### Currency

Use Indian number formatting for INR values.

Example:

**₹5,00,000.00**

The display precision should reflect the applicable business requirements.

### Dates

Use an unambiguous date format for administrative records.

Recommended display format:

**30 Dec 2026**

For dates that require precise interpretation, display the full date and use a consistent format in forms, exports, and supporting details.

Do not use relative labels such as "in two weeks" as the only representation of an official deadline.

### Identifiers

* Use a consistent font and spacing for instrument reference numbers.
* Avoid truncating identifiers without a way to inspect the complete value.
* Provide copy functionality where useful.
* Preserve the original identifier exactly as submitted or confirmed.

---

# 5. Spacing and Layout System

Use a consistent four-pixel base spacing scale.

## 5.1 Spacing Tokens

| Token    | Value | Typical Use                      |
| -------- | ----: | -------------------------------- |
| Space 1  |  4 px | Icon-to-label spacing            |
| Space 2  |  8 px | Compact internal spacing         |
| Space 3  | 12 px | Related controls                 |
| Space 4  | 16 px | Standard component spacing       |
| Space 5  | 20 px | Form groups and content blocks   |
| Space 6  | 24 px | Card padding and section spacing |
| Space 8  | 32 px | Major section separation         |
| Space 10 | 40 px | Large content transitions        |
| Space 12 | 48 px | Page-level separation            |

Use these tokens consistently instead of introducing arbitrary margins for individual components.

## 5.2 Content Width

* Use the available width for dashboards and tables.
* Keep ordinary forms within approximately 960 px.
* Keep record details within approximately 1120 px unless the content requires more space.
* Use two-column layouts for related fields when sufficient horizontal space exists.
* Use a single column for narrow viewports.
* Avoid excessively wide text blocks for explanatory content.

## 5.3 Grid System

Use a responsive 12-column grid for complex desktop layouts.

Recommended behavior:

* Dashboard: 3–4 summary cards per row, depending on available width.
* Two-column detail layout: Main content plus contextual information panel.
* Forms: One or two columns depending on field relationships.
* Document review: Document viewer and structured details side by side on wide screens.
* Mobile: Single-column stacking for all primary content.

The layout must adapt to content rather than forcing every page into a fixed grid.

## 5.4 Card Design

Cards should organize related information, not decorate the page.

Use:

* White background.
* One-pixel border.
* Six- to eight-pixel corner radius.
* Consistent internal padding.
* Minimal or no shadow.

Avoid nesting multiple card layers without a clear information hierarchy.

## 5.5 Borders and Elevation

Use borders as the primary method of separating content.

Recommended elevation levels:

* **Level 0:** Main page background.
* **Level 1:** Cards and ordinary content surfaces.
* **Level 2:** Menus, popovers, and dropdowns.
* **Level 3:** Dialogs and overlays.

Use shadows sparingly and consistently.

---

# 6. Reusable Component System

Components must have consistent visual appearance, interaction behavior, and accessibility semantics across all pages.

## 6.1 Buttons

### Variants

**Primary**

* Filled primary blue.
* White label.
* Used for the main action in a context.

**Secondary**

* White or neutral background.
* Border and primary text.
* Used for supporting actions.

**Tertiary**

* Transparent background.
* Used for low-emphasis actions such as cancel or navigation.

**Destructive**

* Error-colored treatment.
* Reserved for actions with destructive consequences.

**Icon Button**

* Used for compact controls such as search, notifications, and contextual menus.
* Must have an accessible name.

### Sizes

| Size   | Height | Usage                      |
| ------ | -----: | -------------------------- |
| Small  |  32 px | Compact table actions      |
| Medium |  40 px | Default buttons            |
| Large  |  44 px | Prominent form submissions |

Buttons should have clear hover, focus, pressed, disabled, and loading states.

Avoid multiple competing primary buttons in the same visual group.

## 6.2 Form Fields

Supported controls:

* Text input.
* Number input.
* Date input.
* Select.
* Search input.
* Text area.
* File upload.
* Checkbox.
* Radio group.
* Toggle, only for genuine binary settings.

### Field Structure

A standard field should contain:

1. Visible label.
2. Input control.
3. Optional helper text.
4. Validation feedback, when needed.

### Field Rules

* Labels must remain visible when the field is populated.
* Placeholder text must not replace the label.
* Required fields must be identified consistently.
* Errors must appear next to the relevant field.
* Read-only values must be visually distinct from editable inputs.
* Disabled controls must remain understandable.
* Input formats and acceptable values should be explained where needed.

## 6.3 Status Badges

Use compact, text-based badges for record and workflow states.

Each badge must:

* Use a consistent semantic color.
* Contain a readable text label.
* Avoid relying exclusively on color.
* Remain visually consistent across tables, detail pages, and dashboards.
* Use the same label for the same status throughout the product.

Long status names should wrap or use a suitable wider treatment rather than becoming unreadable.

## 6.4 Summary Cards

Summary cards present important portfolio metrics.

Examples:

* Total Instruments.
* Pending Verification.
* Approaching Maturity.
* Unresolved Discrepancies.
* Pending Release Requests.

Each card should contain:

* A concise label.
* A prominent numerical value.
* Optional contextual information.
* An optional navigation action when clicking through is meaningful.

Rules:

* Keep cards visually consistent.
* Do not use a different decorative color for every metric.
* Use semantic emphasis only when it communicates a meaningful condition.
* Make the card interactive only when a useful destination exists.
* Avoid misleading totals caused by overlapping categories.

## 6.5 Data Tables

Tables are a core interaction pattern and must prioritize scanning, sorting, and filtering.

### Table Structure

A standard table may contain:

* Selection checkbox when bulk actions are supported.
* Instrument or request identifier.
* Institution.
* Amount.
* Relevant date.
* Status.
* Last updated.
* Row actions.

Only include columns relevant to the current task.

### Table Rules

* Use clear column headings.
* Align numerical values consistently.
* Use consistent date formatting.
* Keep row actions in a predictable location.
* Support sorting only where meaningful.
* Support pagination for large datasets.
* Display an explicit empty state.
* Preserve filters when users open a record and return to the list where practical.
* Avoid forcing every table to show every available data field.
* Provide an accessible method for viewing truncated values.

### Row Interaction

Clicking a row may open the record details page if that behavior is consistent across the application.

Interactive controls within the row must remain independently operable.

Do not make rows appear clickable if they have no associated action.

## 6.6 Search and Filters

The search component should include:

* A visible or clearly accessible search label.
* A search input.
* A search action or supported live-search behavior.
* Clear-search functionality.
* A result count where useful.

Filters may include:

* Instrument status.
* Verification status.
* Institution.
* Maturity date range.
* Submission date range.
* Request status.

Rules:

* Clearly distinguish active filters.
* Provide a way to clear filters.
* Do not silently reset filters when users paginate.
* Display a useful empty state when no records match.
* Keep filter controls compact without hiding their meaning.

## 6.7 Tabs

Use tabs only when switching between related views of the same resource.

Suitable examples:

* Overview.
* Documents.
* Verification History.
* Renewal History.
* Audit History.

Do not use tabs as a replacement for primary navigation.

## 6.8 Alerts and Banners

Use inline alerts for important contextual messages.

Types:

* Information.
* Success.
* Warning.
* Error.

Alerts should include:

* A concise heading when the message is substantial.
* A clear explanation.
* A next step where appropriate.
* A dismiss action only when dismissal is safe and meaningful.

Critical validation or security messages must not disappear automatically before users can understand them.

## 6.9 Toast Notifications

Use toasts for brief feedback after successful or non-blocking actions.

Examples:

* Changes saved.
* Document uploaded.
* Request submitted.

Rules:

* Keep the message concise.
* Do not use a toast as the only location for critical validation details.
* Do not automatically dismiss important failure information too quickly.
* Avoid stacking many simultaneous notifications.
* Do not use success styling until the action is confirmed.

## 6.10 Dialogs and Confirmation Modals

Use dialogs for short, focused decisions.

Suitable cases:

* Confirming a consequential action.
* Confirming removal of an eligible draft.
* Confirming a workflow decision when additional context is necessary.

Avoid dialogs for long forms or complex document reviews.

Dialogs must:

* Have a clear title.
* Explain the consequence of the action.
* Provide explicit actions.
* Support keyboard interaction.
* Prevent background interaction while modal.
* Return focus to the invoking control after closing.

## 6.11 Pagination

Use pagination when the record set exceeds a practical page size.

Display:

* Current page.
* Total pages or record count when available.
* Previous and next controls.
* Page-size selection if required.

Changing pages must not silently discard active filters or sort settings.

## 6.12 Document Viewer

The document viewer is a high-priority component for this product.

It should support:

* Viewing supported uploaded documents.
* Page navigation for multipage documents.
* Zoom controls where supported.
* Downloading when authorized.
* Clear document metadata.
* Version information when applicable.

On desktop, place the document viewer alongside extracted fields or scrutiny observations where practical.

On narrow screens, provide a deliberate stacked layout rather than squeezing the document into an unusably small panel.

The original document must remain distinguishable from extracted text and reviewer-entered information.

## 6.13 Audit Timeline

Use a chronological timeline for instrument and request history.

Each entry should show:

* Action.
* Actor or responsible role, as permitted.
* Timestamp.
* Relevant status change.
* Observation or decision details where appropriate.

The timeline is a presentation of recorded events, not an editable substitute for the underlying audit data.

## 6.14 File Upload Component

The upload component should support:

* Clear accepted-format information.
* File selection.
* Upload progress.
* File name and size.
* Upload success or failure.
* Retry where appropriate.
* Removal before submission where permitted.

The interface must distinguish between a file being selected, uploaded, processed by OCR, and accepted into the administrative workflow.

---

# 7. Navigation and Information Architecture

## 7.1 Institution Information Architecture

The institution interface should focus on the institution's own instruments and requests.

Primary sections:

* Dashboard.
* FDRs.
* Renewals and Replacements.
* Release/Refund Requests.
* Notifications.

Profile and account actions remain separate from the core administrative workflow.

## 7.2 Official Information Architecture

The official interface should focus on reviewing and monitoring work.

Primary sections:

* Dashboard.
* Verification Queue.
* FDR Records.
* Maturity Monitoring.
* Renewal Tracking.
* Release/Refund Requests.
* Reports.

Administration-specific functions appear only for authorized roles.

## 7.3 Breadcrumbs

Use breadcrumbs on nested pages.

Example:

Dashboard → FDR Records → FDR-00125

Breadcrumbs should represent the user's actual navigation hierarchy.

They should not replace browser history or primary navigation.

## 7.4 Navigation State Preservation

Where practical, preserve:

* Search queries.
* Active filters.
* Current pagination.
* Sort order.
* Selected dashboard context.

This is particularly important when an official opens a record from a queue and then returns to the queue.

---

# 8. Form Design and Validation

Forms must support accurate entry of financial and administrative information.

## 8.1 Form Layout

Use clearly separated groups.

### FDR Submission Form

Recommended sections:

**Section 1: Institution Information**

* Institution identity.
* Relevant reference information.

**Section 2: Instrument Details**

* FDR reference number.
* Issuing bank.
* Branch.
* Deposit amount.
* Issue date.
* Maturity date.

**Section 3: Supporting Documents**

* FDR document.
* Other required documents.

**Section 4: Review and Submit**

* Summary of entered information.
* Extracted values where available.
* Outstanding validation messages.
* Submission action.

Avoid displaying all fields as one long, unstructured form.

## 8.2 Form Actions

Use consistent action placement.

* Primary action: Save, Submit, or Record Decision.
* Secondary action: Save Draft or Cancel, when supported.
* Navigation action: Back, when necessary.

For long forms, keep actions accessible without obscuring the current field.

## 8.3 Validation Rules

Validation should occur at appropriate stages:

* On field blur for simple formatting issues.
* On form submission for required fields and cross-field checks.
* During asynchronous processing for OCR results and server-side validation.

The server remains authoritative for business-rule validation.

### Examples

**Missing amount**

Display an inline message explaining that the amount is required.

**Invalid date relationship**

Explain that the issue date must not be later than the maturity date.

**Potential duplicate reference**

Display a warning and provide access to the existing record when the user is authorized to view it.

**OCR mismatch**

Show the entered value and extracted value side by side.

Do not silently overwrite either value.

## 8.4 Unsaved Changes

When a user attempts to leave a form with unsaved changes:

* Warn the user if data would be lost.
* Offer clear options to remain or leave.
* Preserve entered information where practical.
* Avoid interrupting navigation when no unsaved changes exist.

## 8.5 Consequential Decisions

Approval, rejection, and release-related decisions require greater care than ordinary edits.

Where appropriate, require:

* A clear decision selection.
* A reason or observation.
* Confirmation before final submission.
* A visible indication of the responsible authority.

Do not require unnecessary confirmations for routine, reversible actions.

---

# 9. Status and Workflow UX

## 9.1 Separate Status Dimensions

The interface must distinguish among:

1. Submission status.
2. Verification status.
3. Instrument lifecycle status.
4. Release/refund request status.

These represent different concepts and must not be merged into one ambiguous badge.

For example, an instrument may be:

* Submitted and pending review.
* Independently confirmed and approaching maturity.
* Previously replaced and retained for historical reference.

The interface should communicate each relevant dimension in the appropriate context.

## 9.2 Verification Findings

Automated findings should use explicit labels.

Examples:

* **OCR Extracted:** The value was read from the document.
* **Mismatch Detected:** Entered and extracted values differ.
* **Review Required:** An authorized person needs to investigate.
* **Independently Confirmed:** A permitted verification source confirmed the relevant information.

Never use **Verified** as a generic label for a successful OCR extraction.

## 9.3 Deadline Presentation

Maturity monitoring must prioritize clear dates and required actions.

Examples:

* Matures on 30 Dec 2026.
* Matures in 15 days.
* Maturity date passed.
* Renewal review pending.

Relative dates may supplement, but must not replace, the actual date.

An instrument reaching maturity must not automatically be described as noncompliant.

## 9.4 Review Queues

A review queue should help officials decide what to inspect next.

Display relevant information such as:

* Instrument reference.
* Institution.
* Submission date.
* Current status.
* Outstanding discrepancy.
* Deadline, where relevant.
* Assigned reviewer, where applicable.

If priority ranking is implemented, its basis should be understandable, such as a configured deadline or unresolved required action.

Avoid unexplained AI-generated priority scores.

---

# 10. Loading, Empty, Error, and Success States

Every major page and asynchronous interaction must have explicit feedback.

## 10.1 Loading States

Use loading indicators appropriate to the task.

### Page Loading

Use skeletons or lightweight placeholders for the page's main content.

### Table Loading

Keep table headers visible when practical and show placeholder rows.

### Dashboard Loading

Load metric cards and chart areas without making the page appear completely empty.

### Document Upload

Show progress when available and indicate when the upload has completed.

### OCR Processing

Display a clear processing state, such as:

**Extracting document details…**

The user must understand that processing is still underway.

### Form Submission

Disable repeated submission while the request is in progress and provide a visible loading indicator.

### Rules

* Do not show success before the operation is confirmed.
* Avoid indefinite spinners without explanatory text.
* Preserve existing content during background refreshes where practical.
* Allow safe cancellation where supported.

## 10.2 Empty States

Empty states should explain the absence of data and provide a relevant next step.

### No FDR Records

Message: No FDR records have been added yet.

Action: Submit New FDR, if the user is authorized.

### No Search Results

Message: No records match your search or filters.

Action: Clear Filters.

### No Pending Verification

Message: There are no records awaiting verification.

Do not show a warning color for a normal empty queue.

### No Upcoming Maturity

Message: No instruments currently fall within the configured maturity monitoring window.

### No Release Requests

Message: No release or refund requests are available for this account.

### No Notifications

Message: You're all caught up.

### Rules

* Distinguish an empty result from a failed API request.
* Do not use empty-state illustrations when a simple message is sufficient.
* Never imply that the entire system contains no records when only the current filter returned no results.

## 10.3 Error States

### Validation Errors

Display errors beside the relevant field and provide a summary for long forms.

### Upload Errors

Explain whether the issue relates to file size, file format, network failure, or processing.

### OCR Errors

Preserve the uploaded document and provide a manual-entry or retry option.

### Permission Errors

Explain that the user lacks access without revealing restricted record details.

### Not Found

Display a clear message when the requested record does not exist or cannot be accessed.

Avoid confirming the existence of a restricted record.

### Server Errors

Use a generic, user-friendly explanation and a retry action where appropriate.

Do not expose technical stack traces or sensitive implementation details.

### Session Expiration

Ask the user to authenticate again and preserve unsaved work where practical.

### Conflict Errors

If another user changes a record while it is open, explain that the record has changed and require review before overwriting it.

## 10.4 Success States

Use clear feedback for:

* FDR submitted.
* Document uploaded.
* Information saved.
* Additional information submitted.
* Verification outcome recorded.
* Replacement instrument submitted.
* Release/refund request submitted.
* Decision recorded.
* Report generated.

Where relevant, include the record reference and next expected step.

---

# 11. Interactions and Animation

The interface should feel responsive without relying on decorative animation.

## 11.1 Interaction Principles

* Provide immediate feedback for user actions.
* Avoid unexpected layout shifts.
* Make interactive elements visually identifiable.
* Keep state changes predictable.
* Prevent duplicate submissions.
* Preserve context during navigation.
* Make consequential actions deliberate.

## 11.2 Transition Timing

Recommended durations:

| Interaction                   |   Duration |
| ----------------------------- | ---------: |
| Button hover or pressed state | 100–150 ms |
| Focus and border transitions  | 100–150 ms |
| Dropdown opening              | 120–180 ms |
| Modal transition              | 150–200 ms |
| Sidebar collapse              | 150–200 ms |
| Toast appearance              | 150–200 ms |

These values are guidance rather than mandatory animation requirements.

Use simple opacity or short positional transitions.

Avoid spring animations, elaborate page transitions, animated counters, and decorative motion.

## 11.3 Hover and Focus

Hover states should communicate interactivity.

Keyboard focus must remain visible independently of hover.

Do not hide essential information until a user hovers over an element.

Important table actions must remain discoverable on touch devices.

## 11.4 Reduced Motion

Respect the user's reduced-motion preference.

When reduced motion is enabled:

* Remove nonessential movement.
* Minimize transition effects.
* Avoid animated status indicators where a static indicator works.
* Keep loading feedback understandable.

## 11.5 Drag and Drop

File upload may support drag and drop on compatible devices.

It must also provide a conventional file-selection control.

Drag and drop must never be the only way to upload a document.

## 11.6 Destructive and Consequential Actions

Actions that materially affect a case must provide sufficient context before confirmation.

Examples include:

* Removing an eligible draft.
* Recording a final decision.
* Closing a request where permitted.

Avoid using generic confirmation text such as "Are you sure?" without explaining the action.

---

# 12. Responsive Behavior

The application must support desktop, tablet, and mobile browsers.

## 12.1 Breakpoints

Use the following initial breakpoints:

| Breakpoint    |             Width | Intended Layout                                 |
| ------------- | ----------------: | ----------------------------------------------- |
| Small mobile  |      Below 480 px | Single-column content and compact navigation    |
| Mobile/tablet |        480–767 px | Single-column forms and stacked detail sections |
| Tablet        |       768–1023 px | Collapsible navigation and adaptive card grids  |
| Desktop       |      1024–1439 px | Standard application shell                      |
| Wide desktop  | 1440 px and above | Wider dashboard and table layouts               |

Components should respond to available space rather than relying exclusively on device categories.

## 12.2 Desktop

* Persistent sidebar.
* Wide data tables.
* Side-by-side document review.
* Two-column forms where useful.
* Multiple summary cards per row.
* Contextual detail panels when they improve workflow efficiency.

## 12.3 Tablet

* Collapsible sidebar.
* Reduced horizontal padding.
* Fewer summary cards per row.
* Forms that use two columns only when fields remain readable.
* Document review that may switch to stacked panels.

## 12.4 Mobile

* Single-column forms.
* Drawer-based navigation.
* Stacked summary cards.
* Clear primary actions.
* Full-width form controls.
* Readable status badges.
* Document viewer with practical zoom and navigation controls.
* Simplified table presentation when necessary.

For dense data tables, preserve the identity and status of each record. A mobile layout may use horizontally scrollable tables or structured record cards, depending on the task.

Do not simply shrink desktop tables until text becomes unreadable.

## 12.5 Touch Targets

Interactive controls should have comfortable touch areas.

Aim for approximately 44 × 44 CSS pixels for primary touch interactions where practical.

Smaller visual icons may be used within larger clickable areas.

## 12.6 Responsive Priorities

On every viewport, users must still be able to:

* Identify the current page.
* Understand the record's status.
* Complete core forms.
* Review validation messages.
* Access required documents.
* Perform authorized workflow actions.
* Navigate back to the relevant record list.

---

# 13. Accessibility Requirements

The design should target **WCAG 2.2 Level AA**, subject to implementation and testing.

## 13.1 Color Contrast

Maintain appropriate contrast for:

* Body text.
* Headings.
* Button labels.
* Input labels.
* Status badges.
* Links.
* Focus indicators.
* Disabled-state communication.

Use at least:

* 4.5:1 contrast for normal text.
* 3:1 contrast for large text.
* 3:1 contrast for relevant graphical controls and visual indicators.

Verify actual color combinations rather than assuming that semantic colors are automatically accessible.

## 13.2 Keyboard Navigation

Users must be able to:

* Navigate primary menus.
* Operate forms.
* Access tables and row actions.
* Open and close dialogs.
* Use dropdowns and menus.
* Review notifications.
* Submit forms without a mouse.

Keyboard focus must be visible and must follow a logical order.

Avoid keyboard traps.

## 13.3 Screen Readers

Use appropriate semantic structure for:

* Page headings.
* Navigation.
* Forms and labels.
* Tables.
* Buttons and links.
* Dialogs.
* Status announcements.
* Error summaries.

Status changes and asynchronous results should be announced appropriately without creating excessive screen-reader noise.

## 13.4 Form Accessibility

* Associate each input with a visible label.
* Associate validation messages with the relevant field.
* Identify required fields programmatically and visually.
* Do not communicate errors through color alone.
* Move focus to an appropriate location after major validation failures.
* Ensure that error summaries can be navigated.
* Preserve readable instructions for document uploads.

## 13.5 Tables

* Use semantic table structures.
* Provide meaningful column headers.
* Ensure row actions have descriptive accessible names.
* Make sorting state understandable.
* Avoid using color alone to distinguish rows or statuses.

## 13.6 Focus and Motion

* Provide a visible focus indicator.
* Avoid removing browser focus outlines without a suitable replacement.
* Respect reduced-motion preferences.
* Ensure that focus is managed correctly when dialogs open and close.

## 13.7 Accessibility of Status Information

Use text labels such as:

* Pending Verification.
* Approaching Maturity.
* Additional Information Required.
* Independently Confirmed.

Do not use only green, amber, and red dots to represent important financial or administrative states.

---

# 14. Page-Level Layout Guidance

## 14.1 Institution Dashboard

### Purpose

Help institution representatives understand the current state of their records and identify required actions.

### Layout

**Page header**

* Title: Dashboard.
* Institution name or relevant context.

**Summary cards**

* Total FDRs.
* Pending Review.
* Approaching Maturity.
* Open Requests.

**Main content**

* Upcoming maturity list.
* Recent submission activity.
* Requests requiring attention.
* Recent status changes.

### UX Rules

* Keep the most actionable information near the top.
* Avoid charts that do not help the user take action.
* Make important deadlines explicit.
* Show only the current institution's information.
* Use empty states when no relevant activity exists.

## 14.2 FDR List

### Purpose

Enable users to find instruments quickly.

### Layout

**Page header**

* Title: My FDRs or FDR Records.
* Primary action: Add New FDR, where authorized.

**Toolbar**

* Search.
* Status filter.
* Maturity date filter.
* Additional relevant filters.

**Content**

* Record count.
* Data table.
* Pagination.

### Recommended Columns

* FDR Reference.
* Bank.
* Amount.
* Maturity Date.
* Verification Status.
* Lifecycle Status.
* Last Updated.
* Actions.

### UX Rules

* Use explicit status labels.
* Format amounts consistently.
* Preserve filters when returning from details.
* Provide clear no-results feedback.
* Do not expose institution records beyond the user's permissions.

## 14.3 Add/Edit FDR

### Purpose

Collect accurate instrument information and supporting documents.

### Layout

**Page header**

* Title.
* Brief explanatory text.

**Form**

1. Institution details.
2. Instrument information.
3. Supporting documents.
4. Extracted information and discrepancies, when available.
5. Submission summary.

**Actions**

* Save Draft, if supported.
* Cancel.
* Submit.

### UX Rules

* Group related fields.
* Validate dates and financial values.
* Keep labels visible.
* Show OCR findings alongside the relevant values.
* Distinguish user-entered information from extracted values.
* Prevent duplicate submissions.
* Confirm successful submission with the generated reference.

## 14.4 FDR Details

### Purpose

Present the complete information associated with one instrument.

### Layout

**Header**

* Instrument reference.
* Institution name.
* Relevant status badges.
* Permitted contextual actions.

**Summary section**

* Amount.
* Bank.
* Issue date.
* Maturity date.
* Verification status.

**Main content**

* Instrument details.
* Supporting documents.
* Verification findings.
* Renewal/replacement relationships.
* Timeline of important actions.

### UX Rules

* Keep critical identity and status information visible.
* Separate current values from historical values.
* Make document versions accessible.
* Do not combine verification and lifecycle status.
* Show actions only when authorized.

## 14.5 Verification Queue

### Purpose

Help scrutiny officers manage pending review work.

### Layout

**Header**

* Title: Verification Queue.
* Total pending count, where available.

**Filters**

* Submission date.
* Institution.
* Verification status.
* Deadline or priority category.

**Table**

* Instrument reference.
* Institution.
* Submission date.
* Outstanding issue.
* Current status.
* Assigned reviewer, where applicable.
* Action.

### UX Rules

* Prioritize actionable information.
* Distinguish overdue required actions from ordinary pending reviews.
* Avoid unexplained priority scores.
* Preserve filters when returning from a case.
* Make the next step obvious.

## 14.6 Verification Workspace

### Purpose

Allow an official to review documents, compare values, and record observations.

### Desktop Layout

Use a two-column workspace:

**Left panel**

* Original document.
* Document controls.
* Document metadata.

**Right panel**

* Instrument details.
* Extracted values.
* Discrepancy warnings.
* Verification source.
* Observation form.
* Workflow actions.

A narrow summary header should retain the instrument reference and current status.

### Mobile Layout

Stack the panels:

1. Instrument summary.
2. Document viewer.
3. Extracted details.
4. Discrepancies.
5. Observation and action controls.

### UX Rules

* Preserve the original document.
* Clearly distinguish extracted and confirmed information.
* Explain every flagged discrepancy.
* Require sufficient context for consequential decisions.
* Record the outcome and responsible user.
* Avoid presenting OCR confidence as proof of authenticity.

## 14.7 Maturity Monitoring

### Purpose

Help officials identify instruments approaching maturity and unresolved related actions.

### Layout

**Header**

* Title: Maturity Monitoring.

**Summary**

* Approaching Maturity.
* Matured Instruments.
* Pending Required Actions.

**Filters**

* Date range.
* Institution.
* Lifecycle status.
* Required action status.

**Table**

* Instrument reference.
* Institution.
* Amount.
* Maturity date.
* Time remaining.
* Renewal status.
* Next required action.

### UX Rules

* Display actual dates.
* Use warning styling for approaching deadlines.
* Distinguish matured instruments from overdue administrative actions.
* Avoid implying that maturity automatically means noncompliance.
* Provide a direct route to the relevant record.

## 14.8 Renewal and Replacement Tracking

### Purpose

Show relationships between previous and replacement instruments.

### Layout

**Header**

* Title: Renewals and Replacements.

**Content**

* Search and filters.
* Current instrument.
* Previous instrument reference.
* Submission date.
* Review status.
* Relevant maturity date.

The details page may include a simple chronological history of linked instruments.

### UX Rules

* Never silently remove the previous record.
* Distinguish submitted replacements from accepted replacements.
* Preserve historical document access.
* Clearly identify the current applicable instrument.

## 14.9 Release/Refund Requests

### Purpose

Allow institutions and officials to track requests through the configured administrative workflow.

### Institution View

Display:

* Request reference.
* Associated instrument.
* Submission date.
* Current status.
* Latest observation or required action.
* Last updated.

### Official View

Display:

* Request reference.
* Institution.
* Associated instrument.
* Submission date.
* Current workflow stage.
* Supporting documents.
* Outstanding requirements.
* Authorized actions.

### UX Rules

* Explain what the current status means.
* Clearly show when additional information is required.
* Make the next action visible.
* Display the responsible authority or assigned reviewer where appropriate.
* Do not imply that a request has been financially executed merely because it was approved in the portal.

## 14.10 Administration Dashboard

### Purpose

Provide authorized officials with a consolidated view of the FDR portfolio.

### Layout

**Page header**

* Title: Administration Dashboard.
* Reporting period or last updated time.

**Summary cards**

* Total Instruments.
* Active Instruments.
* Approaching Maturity.
* Pending Verification.
* Unresolved Discrepancies.
* Pending Release/Refund Requests.

**Main sections**

* Upcoming maturity list.
* Pending verification queue.
* Cases requiring intervention.
* Recent administrative activity.

### UX Rules

* Every metric must be traceable to underlying records.
* Clicking a metric should open the corresponding filtered list when useful.
* Avoid excessive charts.
* Make the reporting period explicit.
* Distinguish current data from cached or delayed information where relevant.
* Respect role-based data access.

## 14.11 Reports

### Purpose

Help authorized officials inspect and export relevant administrative information.

### Layout

* Report title.
* Reporting period.
* Filters.
* Results table.
* Export action.
* Generation status.

### UX Rules

* Display the selected reporting period.
* Show when the report was generated.
* Apply permissions to both the screen and exported file.
* Indicate when no data matches the selected criteria.
* Avoid presenting stale data as current.

## 14.12 User and Workflow Settings

### Purpose

Allow authorized administrators to manage application access and configurable behavior.

### Layout

Separate settings into clear sections:

* User Management.
* Role Assignments.
* Notification Rules.
* Reminder Intervals.
* Workflow Configuration.

### UX Rules

* Make the scope of each setting clear.
* Explain consequential changes.
* Record configuration changes in the audit history.
* Avoid giving system administrators financial approval permissions by default.
* Prevent accidental changes to production rules.

## 14.13 Audit Log

### Purpose

Allow authorized users to inspect important system and administrative actions.

### Layout

* Search and filters.
* Actor.
* Action.
* Related record.
* Timestamp.
* Outcome.
* Event details.

### UX Rules

* Use chronological ordering by default.
* Support filtering by actor, action, and record.
* Distinguish successful actions from failures where relevant.
* Keep audit data read-only in the standard interface.
* Restrict sensitive event details to authorized users.

---

# 15. Content and Microcopy Guidelines

The interface should use precise, neutral, task-oriented language.

## 15.1 Writing Principles

* Use plain English.
* Prefer short, direct sentences.
* Explain administrative terms when users may not understand them.
* Use consistent names for statuses and actions.
* Avoid vague error messages.
* Avoid unnecessarily technical language.
* Do not imply official approval or verification when only an automated check has occurred.

## 15.2 Button Labels

Prefer:

* Add New FDR.
* Save Draft.
* Submit for Review.
* Upload Document.
* Request Additional Information.
* Record Verification Outcome.
* Submit Replacement.
* Submit Release Request.
* Record Decision.
* View History.

Avoid generic labels such as "Process," "Execute," or "Continue" when the action can be named more precisely.

## 15.3 Status Language

Use consistent terms.

Examples:

* Draft.
* Submitted.
* Under Review.
* Additional Information Required.
* Pending Approval.
* Independently Confirmed.
* Approaching Maturity.
* Matured.
* Replaced.
* Released.

Only use a status when its meaning matches the actual business state.

## 15.4 Error Message Quality

An error message should answer:

1. What happened?
2. Why does it matter?
3. What can the user do next?

For example:

**Unable to extract the maturity date**

The document could not be read reliably. Review the original document and enter the date manually.

This is more useful than displaying "OCR Error."

---

# 16. Iconography and Illustration

## 16.1 Icons

Use one consistent outline icon library.

Icons should support recognition, not replace necessary labels.

Suitable icon categories include:

* Dashboard.
* Documents.
* Search.
* Notifications.
* Calendar.
* Verification.
* History.
* Settings.
* Download.
* Upload.
* Warning.

Avoid mixing unrelated icon styles.

## 16.2 Illustrations

Illustrations are not required for the MVP.

Use concise text and simple iconography for empty states.

Do not add decorative illustrations to dashboards, document review pages, or financial forms.

## 16.3 Charts

Charts should only be used when they communicate useful portfolio information.

Suitable examples may include:

* Instruments by lifecycle status.
* Upcoming maturity distribution.
* Pending requests by workflow stage.

Prefer simple bars or clearly labeled summaries.

Every chart must have an accessible alternative or equivalent data representation.

---

# 17. Design Consistency Rules

The following rules apply across the entire application:

1. Use the same primary color for primary actions.
2. Use the same spacing scale throughout the interface.
3. Use consistent labels for the same workflow status.
4. Keep page headings and primary actions in predictable locations.
5. Use the same input, table, button, and badge components across pages.
6. Keep institution and instrument identity visible in relevant detail views.
7. Distinguish user-entered, extracted, and independently confirmed information.
8. Preserve historical records and document versions.
9. Use explicit feedback for asynchronous operations.
10. Never rely solely on color to communicate status.
11. Make permission boundaries visible through available actions.
12. Keep dashboards focused on actionable information.
13. Avoid introducing one-off components when an existing pattern is sufficient.
14. Prefer borders and spacing over unnecessary shadows and decorative effects.
15. Ensure every primary workflow works with keyboard navigation.
16. Maintain usable layouts across desktop, tablet, and mobile.
17. Use the same date, currency, and identifier formatting across lists, details, and reports.
18. Record consequential decisions through deliberate, clearly labeled interactions.

---

# 18. Implementation Priorities

The design system should be implemented in the following order.

## Priority 1: Foundation

Establish:

* Color tokens.
* Typography.
* Spacing.
* Application shell.
* Sidebar and top bar.
* Buttons.
* Form controls.
* Status badges.
* Responsive layout behavior.

## Priority 2: Core Administrative Components

Implement:

* Data tables.
* Search and filters.
* Summary cards.
* Alerts and notifications.
* Dialogs.
* Pagination.
* Document upload.
* Record detail layouts.

## Priority 3: Workflow Components

Implement:

* Verification workspace.
* Discrepancy presentation.
* Audit timeline.
* Maturity monitoring.
* Renewal/replacement history.
* Release/refund review interface.

## Priority 4: Polish and Validation

Validate:

* Keyboard navigation.
* Screen-reader semantics.
* Color contrast.
* Mobile usability.
* Loading and error states.
* Consistency across roles.
* Form recovery and validation.
* Table readability with realistic data.

---

# 19. Design Acceptance Criteria

The design is ready for implementation when:

* The institution and official interfaces have clearly defined navigation.
* The design tokens and reusable component patterns are documented.
* Core pages have consistent heading, action, and content layouts.
* FDR records display instrument details and workflow statuses clearly.
* OCR results and discrepancy warnings are distinguishable from independent verification.
* Maturity dates and required actions are easy to identify.
* Forms have defined validation, loading, error, and success states.
* Tables remain usable with large record sets.
* Document review supports comparison between original documents and extracted information.
* Release/refund workflows communicate the current stage and next action.
* Responsive behavior is specified for the primary workflows.
* Accessibility requirements are included in component behavior.
* Consequential actions have clear confirmation and audit expectations.
* No critical workflow depends on decorative styling or color alone.

---

# 20. Final Design Direction

FDR-SMART should be a disciplined, information-first administrative interface.

Its visual identity should come from consistent typography, a restrained navy-and-blue palette, readable data tables, clear workflow statuses, and carefully structured document review screens.

The most important screens are the FDR list, FDR details, verification workspace, maturity monitoring dashboard, and release/refund request workflow. These must be designed around real administrative tasks rather than visual novelty.

**The guiding rule is simple: make the current state clear, the next action obvious, and every important record easy to trace.**

The design must support the product requirements defined in `PRD.md` without inventing regulatory rules, changing authorization boundaries, or presenting automated findings as official financial verification decisions.

**Document status:** Proposed design source of truth for the FDR-SMART MVP. Any change to product workflows or permissions must be validated against `PRD.md` before the design is updated.

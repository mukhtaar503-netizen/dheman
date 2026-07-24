# Product Requirements Document (PRD)
# Service Management System (SMS)

| Field | Value |
|---|---|
| Document Title | Service Management System — Product Requirements Document |
| Version | 1.0 |
| Status | Draft for Development |
| Document Owner | Product Management |
| Classification | Internal / Confidential |
| Prepared For | Software Developers, UI/UX Designers, QA Engineers, DevOps Engineers, Project Managers, Database Architects, AI Coding Assistants (e.g., Claude Code) |
| Last Updated | 2026-07-24 |

---

## Table of Contents

1. Executive Summary
2. Business Overview
3. Problem Statement
4. Project Objectives
5. Project Scope
6. Stakeholders
7. User Personas
8. Functional Requirements
9. Non-Functional Requirements
10. Business Rules
11. Success Metrics
12. Risks
13. Assumptions
14. Constraints
15. Future Enhancements
16. Acceptance Criteria
17. Glossary
18. Appendix

---

# 1. Executive Summary

## 1.1 Purpose

This document defines the complete product requirements for the **Service Management System (SMS)**, a purpose-built, enterprise-grade software platform designed to digitize and manage the end-to-end operations of a services-only company that specializes in **Furniture Installation, Aluminum Installation, CCTV Installation, PVC Ceiling Installation, and PVC Wall Panel Installation**.

Unlike a traditional e-commerce or inventory-driven ERP, this system is built around **service delivery lifecycles** rather than product sales. The company does not sell physical goods to customers; it sells **labor, expertise, and installation/maintenance services**. Therefore, the SMS must be architected around concepts such as service requests, site inspections, quotations, project execution, technician scheduling, and post-installation support — not shopping carts, SKUs, or retail inventory.

The purpose of this PRD is to provide an unambiguous, implementation-ready specification that can be directly consumed by:

- **Software Developers** — to build backend APIs, frontend interfaces, and integrations.
- **UI/UX Designers** — to design wireframes, user flows, and design systems.
- **QA Engineers** — to derive test plans, test cases, and acceptance criteria.
- **DevOps Engineers** — to design CI/CD pipelines, deployment topology, and infrastructure.
- **Database Architects** — to design the relational schema, indexes, and data lifecycle policies.
- **Project Managers** — to plan sprints, milestones, and resource allocation.
- **AI Coding Assistants (e.g., Claude Code)** — to autonomously scaffold, generate, and validate code against explicit, unambiguous requirements.

## 1.2 Vision

To become the **single source of truth** for the company's service operations — replacing spreadsheets, WhatsApp messages, paper job sheets, and verbal coordination with a unified, auditable, real-time digital platform that connects **customers, field technicians, supervisors, project managers, and finance** on one system.

The long-term vision is a platform that:

- Enables **any authorized employee**, from any location, to know the real-time status of any customer, project, technician, or payment.
- Reduces the time between "customer inquiry" and "technician on-site" from days to hours.
- Provides company leadership with **live, data-driven visibility** into revenue, project profitability, and operational bottlenecks.
- Scales from a single-city operation to a multi-branch, multi-city service enterprise without re-architecture.

## 1.3 Business Value

| Value Driver | Description |
|---|---|
| Operational Efficiency | Eliminates manual, paper-based, and spreadsheet-based coordination between sales, site inspection, project management, and technicians. |
| Revenue Visibility | Real-time dashboards on quotations, approved projects, invoices, and outstanding payments improve cash flow forecasting. |
| Faster Quotation Turnaround | Standardized quotation templates and material estimation tools reduce quotation preparation time from days to hours. |
| Improved Customer Experience | Customers receive timely updates, transparent quotations, and a documented service history. |
| Technician Accountability | Task assignment, time tracking, and photo-based proof-of-work create accountability and reduce disputes. |
| Data-Driven Decision Making | Centralized reporting on profitability per project, per service type, and per technician enables informed business decisions. |
| Audit & Compliance | Full audit trails for financial transactions, quotations, and approvals reduce fraud risk and support dispute resolution. |
| Scalability | A role-based, multi-branch-ready architecture supports business growth without operational chaos. |

## 1.4 Digital Transformation Goals

1. **Eliminate paper-based job sheets and manual Excel-based quotations.**
2. **Centralize all customer communication history** (calls, site visits, quotations, approvals) into a single customer record.
3. **Digitize the site inspection process** with structured checklists, photos, and measurements captured on mobile devices.
4. **Automate quotation-to-invoice conversion**, reducing manual re-entry of data and associated errors.
5. **Enable real-time technician scheduling and dispatch**, replacing verbal or WhatsApp-based coordination.
6. **Provide role-based dashboards** so every stakeholder — from Super Admin to Technician to Customer — sees only the information relevant to their role.
7. **Establish a single financial ledger** for expenses, invoices, and payments per project, enabling accurate profitability analysis.
8. **Lay the technical foundation** for future AI-assisted features (e.g., automated material estimation, predictive maintenance) as described in Section 15.

---

# 2. Business Overview

## 2.1 Company Background

The company operates as a **pure-service enterprise** in the installation and maintenance industry, without a retail or e-commerce arm. Its core service lines are:

- **Furniture Installation** — assembly and installation of office and residential furniture (workstations, cabinets, partitions, modular furniture).
- **Aluminum Installation** — aluminum windows, doors, frames, partitions, and structural aluminum work for residential and commercial clients.
- **CCTV Installation** — supply-and-install or install-only CCTV camera systems, including cabling, DVR/NVR configuration, and basic network setup.
- **PVC Ceiling Installation** — false ceiling installation using PVC panels for residential, commercial, and industrial spaces.
- **PVC Wall Panel Installation** — decorative and functional PVC wall panel installation for interior finishing.

The company engages with customers who are typically **individuals, contractors, real estate developers, or commercial businesses** requiring one or more of the above services, often on a project basis (a single customer engagement may include multiple service types, e.g., "PVC ceiling + wall panels" in the same site visit).

## 2.2 Current Problems

Prior to the SMS, business operations are coordinated through a mix of:

- Phone calls and WhatsApp messages for customer inquiries and technician coordination.
- Manual, non-standardized Excel spreadsheets for quotations and material lists.
- Paper job sheets carried by technicians to site, later manually re-entered (if at all) into records.
- Cash and bank transfer payments tracked in physical ledgers or ad hoc spreadsheets, with no centralized reconciliation.
- No formal, structured record of site inspection findings (measurements, photos, access notes), leading to quotation inaccuracies.
- No systematic way to know which technician is available, where they are assigned, or their current workload.

## 2.3 Manual Workflow (As-Is)

The current, informal workflow typically follows this pattern:

1. A customer calls or messages the company describing a required service.
2. An admin or manager manually notes down the customer's details (often on paper or in a personal notebook/spreadsheet).
3. A site visit is scheduled verbally; a supervisor or technician visits the site to take measurements.
4. Measurements and material requirements are estimated manually, often based on the visiting staff's memory or handwritten notes.
5. A quotation is prepared manually in Word/Excel and shared with the customer via WhatsApp or email — this can take 1–5 days depending on staff availability.
6. Once approved (verbally or via message), a technician is assigned informally, often based on who is "free" rather than skill-matching or workload balancing.
7. The technician executes the work on-site, with progress reported only verbally or not at all until completion.
8. Materials used are recorded (if at all) on paper receipts, which may be lost.
9. Invoicing is prepared manually after job completion, often with delays.
10. Payments are collected in cash or via bank transfer and recorded in a separate, disconnected ledger.
11. No structured reporting exists on project profitability, technician productivity, or customer satisfaction.

## 2.4 Existing Challenges

| Challenge Area | Description | Business Impact |
|---|---|---|
| Customer Data Fragmentation | Customer information is scattered across phones, notebooks, and spreadsheets. | Lost leads, duplicated effort, poor follow-up. |
| Quotation Delays | Manual quotation preparation takes days. | Lost deals to faster competitors. |
| Inaccurate Material Estimation | Estimates rely on individual memory/experience rather than structured data. | Cost overruns, project delays due to material shortages. |
| Technician Scheduling Conflicts | No central visibility into technician availability. | Double-booking, idle technicians, missed appointments. |
| Payment Tracking Gaps | Payments recorded in disconnected ledgers. | Cash leakage, disputes over amounts paid/owed. |
| No Reporting | No dashboards or reports exist for revenue, profitability, or productivity. | Leadership operates without real-time data, delaying strategic decisions. |
| Poor Communication | Status updates rely on ad hoc phone calls. | Customer dissatisfaction, repeated status-check calls burdening staff. |
| No Audit Trail | Changes to quotations, prices, or assignments are not tracked. | Disputes cannot be resolved with evidence; risk of internal fraud. |

## 2.5 Future Growth

The company intends to grow from a single-location operation into a **multi-branch, multi-city operation**, potentially adding new service lines (e.g., electrical work, plumbing, painting) in the future. The SMS must therefore be designed with:

- A **role-based access control (RBAC)** model that can extend to branch-level or region-level data segregation.
- A **service catalog architecture** that allows new service types to be added without schema changes (data-driven service configuration, not hardcoded enums).
- A **modular architecture** allowing new modules (e.g., inventory, subcontractor management) to be added incrementally.
- API-first design to support a future **customer-facing mobile application** and **field technician mobile application**.

---

# 3. Problem Statement

The company currently lacks a unified digital system to manage its complete service delivery lifecycle, resulting in operational inefficiency, revenue leakage, and poor customer experience. Specifically:

### 3.1 Manual Paperwork
All customer intake, site inspection notes, and job sheets are handled on paper or informally via chat applications, with no standardized digital format. This results in lost documents, illegible handwriting, and no historical searchability.

### 3.2 Customer Tracking
There is no centralized customer database. Sales and follow-up activities depend on individual staff memory, resulting in missed follow-ups, duplicate customer records, and inability to analyze customer lifetime value or repeat business.

### 3.3 Quotation Delays
Quotations are manually typed per request without templates or historical pricing references, causing 1–5 day turnaround times. Competitors with faster response times win the business.

### 3.4 Material Estimation
Material quantities (e.g., PVC sheets, aluminum profiles, screws, brackets) are estimated by individual staff without a standardized calculation methodology, leading to material shortages mid-project or excess procurement that ties up cash.

### 3.5 Technician Scheduling
There is no scheduling system. Assigning technicians to jobs is done verbally, without visibility into who is already booked, their skill set, or their location, resulting in scheduling conflicts and inefficient technician utilization.

### 3.6 Payment Tracking
Payments (advance, partial, final) are recorded inconsistently across notebooks and spreadsheets. There is no single view of how much a customer owes, has paid, or the payment due dates, leading to delayed collections and cash flow unpredictability.

### 3.7 Reporting
No structured reports exist for revenue, expenses, project profitability, or technician productivity. Business decisions are made based on gut feeling rather than data.

### 3.8 Communication
Customers receive updates only when they call to ask. There is no proactive notification system for quotation approval, scheduled visit dates, project start/completion, or payment due reminders — resulting in a high volume of inbound "status check" calls that consume staff time.

---

# 4. Project Objectives

## 4.1 Business Objectives

- BO-1: Reduce quotation turnaround time from an average of 3 days to under 24 hours.
- BO-2: Achieve 100% digital record-keeping for all customers, projects, and financial transactions within 6 months of launch.
- BO-3: Increase repeat business by enabling structured follow-up and service history tracking.
- BO-4: Support expansion to at least 3 additional branches without requiring a system redesign.
- BO-5: Reduce administrative overhead (manual data entry, reconciliation) by at least 40%.

## 4.2 Technical Objectives

- TO-1: Build a scalable, modular, API-first backend using Node.js, Express.js, and TypeScript.
- TO-2: Implement a normalized, well-indexed relational schema in Supabase PostgreSQL via Prisma ORM.
- TO-3: Implement secure authentication using JWT with refresh token rotation and RBAC enforcement at the API layer.
- TO-4: Ensure all API endpoints are documented via Swagger/OpenAPI for internal and future third-party integration use.
- TO-5: Containerize the application with Docker and establish a repeatable deployment pipeline using PM2 and Nginx as a reverse proxy.
- TO-6: Achieve a mobile-responsive frontend using Next.js, Tailwind CSS, and shadcn/ui, tested across modern browsers and mobile devices.

## 4.3 Operational Objectives

- OO-1: Provide supervisors and project managers real-time visibility into all active projects and technician assignments.
- OO-2: Enable technicians to receive job assignments and update task status from a mobile-friendly interface.
- OO-3: Standardize the site inspection process with structured digital checklists and photo capture.
- OO-4: Enable accountants to track all expenses, invoices, and payments per project in a single ledger view.

## 4.4 Financial Objectives

- FO-1: Provide real-time visibility into outstanding receivables to improve collections and reduce Days Sales Outstanding (DSO).
- FO-2: Enable per-project profitability tracking (revenue minus material and labor cost) to identify high-margin service lines.
- FO-3: Reduce invoicing errors and disputes through automated quotation-to-invoice conversion.

## 4.5 Customer Experience Objectives

- CX-1: Provide customers with a self-service portal to view quotations, approve/reject them digitally, and track project status.
- CX-2: Send automated notifications for key milestones (quotation ready, visit scheduled, project started/completed, payment due).
- CX-3: Reduce average response time to customer inquiries to under 4 business hours.

---

# 5. Project Scope

## 5.1 In Scope

The following modules and capabilities are within the scope of the initial SMS release (Version 1.0):

- User authentication and Role-Based Access Control (8 roles as defined in this document).
- Customer Relationship Management (customer records, contact history, service history).
- Service Catalog Management (configurable service types: Furniture, Aluminum, CCTV, PVC Ceiling, PVC Wall Panel).
- Service Request intake and lifecycle tracking.
- Site Inspection scheduling, checklist capture, photo/measurement upload.
- Quotation creation, versioning, approval workflow (customer approval/rejection).
- Project Management (project creation from approved quotation, milestones, status tracking).
- Task Management (breakdown of projects into assignable tasks/sub-tasks).
- Technician Management (skills, availability, workload).
- Scheduling & Dispatch (calendar-based assignment of technicians to tasks/site visits).
- Materials Tracking (estimated vs. actual materials used per project).
- Expense Management (project-linked and general operating expenses).
- Invoicing (generation from approved quotations/completed projects).
- Payments (recording advance, partial, and final payments; multiple payment methods).
- Reporting & Analytics (revenue, profitability, technician productivity, customer satisfaction).
- Notifications (in-app, email; SMS/WhatsApp architecture-ready per Section 15).
- Role-specific Dashboards.
- System Settings (company profile, service catalog configuration, tax/currency settings, user management).
- RESTful API with Swagger/OpenAPI documentation.
- Audit logging of critical business actions.

## 5.2 Out of Scope

The following are explicitly **out of scope** for Version 1.0:

- E-commerce functionality (product catalog, shopping cart, checkout) — the company does not sell products.
- Physical inventory/warehouse management with stock-keeping units (SKUs) and reorder automation (see Future Scope).
- Native mobile applications (iOS/Android) — Version 1.0 delivers a responsive web application only.
- Integrated payment gateway processing (online card/wallet payments) — Version 1.0 records payments made offline (cash, bank transfer, cheque); online payment collection is a future enhancement.
- Third-party accounting software integration (e.g., QuickBooks, Xero) — may be considered post-launch.
- Multi-currency, multi-language support — Version 1.0 supports a single currency and English language only.
- Subcontractor/vendor marketplace functionality.
- Offline-first mobile data capture (technicians require internet connectivity in V1).
- AI-based automated quotation generation or predictive maintenance (see Future Enhancements, Section 15).

## 5.3 Future Scope

The following are identified as candidates for subsequent releases (see also Section 15 — Future Enhancements):

- Native mobile applications for technicians and customers.
- Full inventory/warehouse management module with stock levels and purchase orders.
- GPS-based technician location tracking and route optimization.
- WhatsApp Business API and SMS gateway integration for notifications.
- Online payment gateway integration.
- Offline mode with data synchronization for field technicians.
- AI-assisted material estimation and predictive maintenance scheduling.
- Multi-branch and multi-region operational reporting.
- Customer loyalty and referral program management.

---

# 6. Stakeholders

| Stakeholder | Interest / Role in the Project |
|---|---|
| **Company Owner** | Ultimate decision-maker; primary beneficiary of business intelligence, revenue visibility, and operational control. Sponsors the project and defines strategic priorities. |
| **Admin (Operations Management)** | Responsible for day-to-day configuration, user management, and ensuring the platform reflects real business processes. |
| **Managers (Project Managers, Supervisors)** | Rely on the system to plan, assign, and monitor project execution; accountable for on-time, on-budget delivery. |
| **Technicians** | End users who execute field work; require a simple, mobile-friendly interface to receive assignments and report progress. |
| **Customers** | External stakeholders who initiate service requests, receive quotations, approve work, and make payments; their satisfaction is a core success metric. |
| **Accountant** | Relies on the system for accurate, timely financial records — invoices, payments, and expenses — to manage cash flow and reporting. |
| **Development Team** | Responsible for building, testing, and maintaining the system per this PRD. |
| **QA Team** | Responsible for validating that delivered functionality meets the acceptance criteria defined herein. |
| **DevOps Team** | Responsible for deployment, infrastructure reliability, and system monitoring. |

---

# 7. User Personas

## 7.1 Persona: Business Owner — "Mr. Al-Rashid"

- **Role:** Company Owner / Super Admin
- **Age:** 45
- **Tech Comfort:** Moderate — comfortable with smartphones and basic web apps, not a power user.
- **Goals:** Wants a single dashboard showing monthly revenue, active projects, and outstanding payments without asking staff for reports. Wants to expand to new branches with confidence that operations won't collapse under growth.
- **Frustrations:** Currently has no visibility into business performance without calling multiple staff members and manually compiling numbers. Discovers cash flow problems too late.
- **How SMS Helps:** A Super Admin dashboard with real-time KPIs (Section 11), the ability to drill into any project or technician, and exportable financial reports.

## 7.2 Persona: Project Manager — "Fatima"

- **Role:** Project Manager
- **Age:** 32
- **Tech Comfort:** High — uses spreadsheets and project tools daily.
- **Goals:** Wants to see all active projects on one screen, quickly identify which are behind schedule, and reassign technicians when conflicts arise.
- **Frustrations:** Currently tracks projects across multiple WhatsApp groups and a personal spreadsheet; frequently loses track of which technician is where.
- **How SMS Helps:** Project Management module with Gantt-style/milestone views, technician scheduling calendar, and real-time task status updates from the field.

## 7.3 Persona: Technician — "Ahmed"

- **Role:** Technician (Aluminum Installation Specialist)
- **Age:** 27
- **Tech Comfort:** Basic — comfortable with WhatsApp and simple mobile apps, not desktop software.
- **Goals:** Wants to know his job schedule for the day/week without calling the office, and wants a simple way to mark tasks complete and upload photos.
- **Frustrations:** Currently receives job details verbally or via WhatsApp voice notes, sometimes arrives at sites with incomplete information (wrong address, missing material list).
- **How SMS Helps:** A mobile-responsive technician view showing assigned tasks, site address, material checklist, and one-tap status updates with photo upload.

## 7.4 Persona: Customer — "Mrs. Chen"

- **Role:** Customer (Commercial client requesting PVC ceiling installation)
- **Age:** 38
- **Tech Comfort:** High — expects modern, app-like digital experiences.
- **Goals:** Wants a fast, transparent quotation process and the ability to track project progress without repeatedly calling the company.
- **Frustrations:** In the past, has waited days for quotations and had no way to verify project status other than phone calls.
- **How SMS Helps:** Customer portal to submit service requests, view/approve quotations online, track project milestones, and view/download invoices.

## 7.5 Persona: Accountant — "Priya"

- **Role:** Accountant
- **Age:** 35
- **Tech Comfort:** High — proficient with accounting software and spreadsheets.
- **Goals:** Wants accurate, real-time visibility into all invoices, payments received, and outstanding balances, without manually reconciling multiple sources.
- **Frustrations:** Currently reconciles payments from bank statements against a manually maintained spreadsheet, a slow and error-prone process.
- **How SMS Helps:** Centralized Invoices & Payments module with automatic balance calculation, payment status tracking, and exportable financial reports.

---

# 8. Functional Requirements

Each subsection below lists functional requirements using the format **FR-[Module]-[Number]**, including a description, priority (Must Have / Should Have / Could Have — MoSCoW), and primary actor(s).

## 8.1 Authentication

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-AUTH-01 | Users shall log in using email and password. | Must Have | All Roles |
| FR-AUTH-02 | System shall issue a short-lived JWT access token (default 15 minutes) and a long-lived refresh token (default 7 days) upon successful login. | Must Have | System |
| FR-AUTH-03 | System shall support refresh token rotation — each use of a refresh token invalidates it and issues a new one. | Must Have | System |
| FR-AUTH-04 | System shall support secure logout that revokes the active refresh token. | Must Have | All Roles |
| FR-AUTH-05 | System shall enforce password complexity rules (minimum 8 characters, at least one uppercase, one number, one special character). | Must Have | System |
| FR-AUTH-06 | System shall support "Forgot Password" via a time-limited, single-use email reset link. | Must Have | All Roles |
| FR-AUTH-07 | System shall lock an account for 15 minutes after 5 consecutive failed login attempts. | Should Have | System |
| FR-AUTH-08 | Customers shall be able to self-register via a public registration form; internal roles (Admin through Accountant) shall only be created by a Super Admin or Admin. | Must Have | Customer, Admin |
| FR-AUTH-09 | System shall enforce RBAC on every API endpoint based on the authenticated user's role. | Must Have | System |
| FR-AUTH-10 | System shall support optional Two-Factor Authentication (2FA) via email OTP for Super Admin and Admin roles. | Should Have | Super Admin, Admin |

## 8.2 Dashboard

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-DASH-01 | Each role shall be presented with a dashboard tailored to their responsibilities upon login (see Section 8 role-dashboard matrix below). | Must Have | All Roles |
| FR-DASH-02 | Super Admin/Admin dashboard shall display: total customers, active projects, monthly revenue, outstanding receivables, pending quotations, and technician utilization. | Must Have | Super Admin, Admin |
| FR-DASH-03 | Project Manager dashboard shall display: active projects by status, upcoming site inspections, unassigned tasks, and overdue milestones. | Must Have | Project Manager |
| FR-DASH-04 | Technician dashboard shall display: today's assigned tasks, upcoming scheduled tasks, and task completion history. | Must Have | Technician |
| FR-DASH-05 | Accountant dashboard shall display: outstanding invoices, payments received this month, upcoming payment due dates, and expense summary. | Must Have | Accountant |
| FR-DASH-06 | Customer dashboard shall display: active service requests, pending quotations awaiting approval, active project status, and invoice/payment history. | Must Have | Customer |
| FR-DASH-07 | Dashboards shall support date-range filtering (Today, This Week, This Month, This Quarter, Custom Range). | Should Have | Internal Roles |

**Role–Dashboard Widget Matrix**

| Widget | Super Admin | Admin | Project Manager | Supervisor | Site Inspector | Technician | Accountant | Customer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Revenue & Financial KPIs | ✔ | ✔ | – | – | – | – | ✔ | – |
| All Projects Overview | ✔ | ✔ | ✔ | ✔ (assigned) | – | – | – | – |
| My Active Projects | – | – | – | – | – | – | – | ✔ |
| Quotation Pipeline | ✔ | ✔ | ✔ | – | – | – | – | ✔ (own) |
| Technician Scheduling Calendar | ✔ | ✔ | ✔ | ✔ | – | – | – | – |
| My Assigned Tasks | – | – | – | ✔ | ✔ | ✔ | – | – |
| Invoices & Payments | ✔ | ✔ | – | – | – | – | ✔ | ✔ (own) |
| Expense Summary | ✔ | ✔ | ✔ (own projects) | – | – | – | ✔ | – |
| Site Inspection Queue | ✔ | ✔ | ✔ | ✔ | ✔ | – | – | – |
| User Management Shortcut | ✔ | ✔ | – | – | – | – | – | – |

## 8.3 Customer Management

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-CUST-01 | System shall allow creation of a customer profile with: full name, company name (optional), phone number, email, billing address, and one or more site addresses. | Must Have | Admin, Project Manager, Customer (self) |
| FR-CUST-02 | System shall support customer type classification: Individual / Corporate. | Must Have | Admin |
| FR-CUST-03 | System shall maintain a complete history per customer: all service requests, quotations, projects, invoices, and payments. | Must Have | System |
| FR-CUST-04 | System shall prevent duplicate customer creation by checking phone number/email uniqueness and warning the user of potential duplicates. | Should Have | System |
| FR-CUST-05 | System shall allow tagging/categorization of customers (e.g., VIP, Referral Source, Recurring Client). | Could Have | Admin |
| FR-CUST-06 | System shall log all communication notes (calls, meetings) against a customer record with timestamp and author. | Should Have | Admin, Project Manager |
| FR-CUST-07 | System shall support soft-deletion (deactivation) of customer records rather than hard deletion, preserving historical data integrity. | Must Have | Admin |
| FR-CUST-08 | Customers shall be able to view and update their own profile and site addresses via the customer portal. | Must Have | Customer |

## 8.4 Service Management

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-SVC-01 | System shall maintain a configurable Service Catalog with the five initial service categories (Furniture Installation, Aluminum Installation, CCTV Installation, PVC Ceiling Installation, PVC Wall Panel Installation), each extensible with sub-services. | Must Have | Super Admin, Admin |
| FR-SVC-02 | Each service category shall support definition of default unit-of-measure (e.g., per square foot, per linear foot, per unit) for estimation purposes. | Must Have | Super Admin, Admin |
| FR-SVC-03 | Each service category shall support a configurable checklist template used during site inspection (see Section 8.6). | Should Have | Super Admin, Admin |
| FR-SVC-04 | System shall allow enabling/disabling a service category without deleting historical data tied to it. | Must Have | Super Admin |
| FR-SVC-05 | System shall support attaching a base price list (per unit) per service category, used to pre-fill quotation line items. | Should Have | Admin, Accountant |

## 8.5 Service Requests

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-SR-01 | Customers shall be able to submit a Service Request specifying: service category, description, preferred site address, and preferred contact time. | Must Have | Customer |
| FR-SR-02 | Admin/Project Manager shall be able to create a Service Request on behalf of a customer (e.g., from a phone inquiry). | Must Have | Admin, Project Manager |
| FR-SR-03 | Each Service Request shall progress through a defined status lifecycle: `New → Under Review → Site Inspection Scheduled → Quotation Sent → Approved → Converted to Project → Rejected/Closed`. | Must Have | System |
| FR-SR-04 | System shall auto-generate a unique, human-readable Service Request reference number (e.g., `SR-2026-00042`). | Must Have | System |
| FR-SR-05 | System shall allow assignment of a Service Request to a Project Manager or Admin for follow-up ownership. | Must Have | Admin |
| FR-SR-06 | System shall notify the assigned owner when a new Service Request is created. | Must Have | System |
| FR-SR-07 | System shall allow attachment of files/photos to a Service Request (e.g., customer-provided reference images). | Should Have | Customer, Admin |
| FR-SR-08 | Customers shall be able to view the real-time status of their own Service Requests. | Must Have | Customer |

## 8.6 Site Inspection

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-INSP-01 | System shall allow scheduling a Site Inspection against a Service Request, assigning a Site Inspector and a date/time. | Must Have | Admin, Project Manager |
| FR-INSP-02 | Site Inspector shall complete a digital checklist specific to the requested service category (e.g., wall dimensions for PVC panels, power source availability for CCTV). | Must Have | Site Inspector |
| FR-INSP-03 | System shall allow capture of measurements (length, width, height, area) with unit selection (meters/feet). | Must Have | Site Inspector |
| FR-INSP-04 | System shall allow upload of multiple site photos, stored via Supabase Storage and linked to the inspection record. | Must Have | Site Inspector |
| FR-INSP-05 | System shall allow the Site Inspector to record site access notes, special conditions, and safety concerns (e.g., "requires scaffolding," "no elevator access"). | Should Have | Site Inspector |
| FR-INSP-06 | Upon inspection completion, the system shall notify the assigned Project Manager/Admin that the inspection is ready for quotation preparation. | Must Have | System |
| FR-INSP-07 | System shall allow re-scheduling or cancellation of a Site Inspection with a reason code. | Should Have | Admin, Project Manager |
| FR-INSP-08 | Inspection data (measurements, photos, checklist) shall be available for reference when preparing the Quotation and later the Project. | Must Have | System |

## 8.7 Quotation Management

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-QUOTE-01 | System shall allow creation of a Quotation linked to a Service Request/Site Inspection, containing one or more line items (service, description, quantity, unit price, subtotal). | Must Have | Admin, Project Manager |
| FR-QUOTE-02 | System shall auto-calculate line item subtotals, apply configurable tax rate(s), and compute the grand total. | Must Have | System |
| FR-QUOTE-03 | System shall support optional discount application (percentage or fixed amount) with mandatory reason/note when discount exceeds a configurable threshold. | Should Have | Admin |
| FR-QUOTE-04 | System shall support quotation versioning — revising a quotation creates a new version while preserving prior versions for audit purposes. | Must Have | System |
| FR-QUOTE-05 | System shall auto-generate a unique quotation number (e.g., `QT-2026-00042`) and a PDF-exportable quotation document. | Must Have | System |
| FR-QUOTE-06 | System shall allow sending the quotation to the customer via the portal and email notification. | Must Have | Admin |
| FR-QUOTE-07 | Customer shall be able to digitally Approve or Reject a quotation, optionally with comments, via the customer portal. | Must Have | Customer |
| FR-QUOTE-08 | System shall enforce a configurable quotation validity period (e.g., 15 days), after which the quotation auto-expires unless approved. | Should Have | System |
| FR-QUOTE-09 | Upon customer approval, the system shall enable conversion of the Quotation into a Project (see 8.8). | Must Have | Admin, Project Manager |
| FR-QUOTE-10 | System shall maintain a full audit log of quotation status changes (created, sent, viewed, approved, rejected, expired, revised) with timestamps and actor identity. | Must Have | System |

## 8.8 Project Management

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-PROJ-01 | System shall create a Project record automatically upon Quotation approval, inheriting customer, service line items, and agreed price. | Must Have | System |
| FR-PROJ-02 | Each Project shall have a defined status lifecycle: `Planning → Scheduled → In Progress → On Hold → Completed → Closed → Cancelled`. | Must Have | System |
| FR-PROJ-03 | System shall allow assignment of a Project Manager and one or more Supervisors to a Project. | Must Have | Admin |
| FR-PROJ-04 | System shall support definition of Project Milestones with target dates (e.g., "Material Procurement Complete," "Installation Complete," "Client Sign-off"). | Must Have | Project Manager |
| FR-PROJ-05 | System shall auto-generate a unique Project number (e.g., `PRJ-2026-00042`) linked to the source Quotation. | Must Have | System |
| FR-PROJ-06 | System shall track overall Project completion percentage, derived from completed Tasks (see 8.9). | Should Have | System |
| FR-PROJ-07 | System shall allow attaching documents (contracts, permits, sign-off forms) to a Project. | Should Have | Project Manager, Admin |
| FR-PROJ-08 | System shall allow the Customer to view real-time Project status and milestone progress via the portal. | Must Have | Customer |
| FR-PROJ-09 | System shall require a documented reason when a Project is placed On Hold or Cancelled. | Must Have | Project Manager, Admin |
| FR-PROJ-10 | System shall support capturing a digital customer sign-off (approval) upon Project completion. | Should Have | Customer, Project Manager |

## 8.9 Task Management

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-TASK-01 | System shall allow breaking down a Project into discrete Tasks (e.g., "Install ceiling frame — Room 2"), each with a description, due date, and priority. | Must Have | Project Manager, Supervisor |
| FR-TASK-02 | Each Task shall have a status lifecycle: `To Do → Assigned → In Progress → Completed → Verified → Reopened`. | Must Have | System |
| FR-TASK-03 | System shall allow assignment of one or more Technicians to a Task. | Must Have | Project Manager, Supervisor |
| FR-TASK-04 | Technicians shall be able to update Task status and add progress notes from their dashboard. | Must Have | Technician |
| FR-TASK-05 | System shall allow Technicians to upload before/after/progress photos against a Task. | Must Have | Technician |
| FR-TASK-06 | System shall require Supervisor verification (status change to `Verified`) before a Task counts toward Project completion percentage. | Should Have | Supervisor |
| FR-TASK-07 | System shall support Task dependencies (Task B cannot start until Task A is completed). | Could Have | Project Manager |
| FR-TASK-08 | System shall log time spent per Task (start/stop or manual entry) for productivity reporting. | Should Have | Technician |
| FR-TASK-09 | System shall allow reopening a Completed/Verified Task with a mandatory reason (e.g., rework required). | Must Have | Supervisor, Project Manager |

## 8.10 Technician Management

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-TECH-01 | System shall maintain a Technician profile: name, contact info, skill tags (e.g., Aluminum, CCTV), employment type, and status (Active/Inactive/On Leave). | Must Have | Admin |
| FR-TECH-02 | System shall track each Technician's current workload (count of active assigned Tasks). | Must Have | System |
| FR-TECH-03 | System shall allow filtering/searching Technicians by skill and availability when assigning Tasks. | Must Have | Project Manager, Supervisor |
| FR-TECH-04 | System shall maintain a historical record of all Tasks/Projects a Technician has worked on, for performance review purposes. | Should Have | Admin, Project Manager |
| FR-TECH-05 | System shall support marking Technician leave/unavailability periods, excluding them from scheduling suggestions during that period. | Should Have | Admin, Technician (request), Admin (approve) |
| FR-TECH-06 | System shall calculate a basic productivity score per Technician (e.g., tasks completed on time / total tasks assigned) for reporting. | Could Have | System |

## 8.11 Scheduling

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-SCHED-01 | System shall provide a calendar view (day/week/month) showing all scheduled Site Inspections and Task assignments across Technicians. | Must Have | Admin, Project Manager, Supervisor |
| FR-SCHED-02 | System shall prevent double-booking a Technician for overlapping time slots, with an override option requiring confirmation. | Should Have | System |
| FR-SCHED-03 | System shall send a notification/reminder to the assigned Technician ahead of a scheduled Task or Site Inspection (configurable lead time, default 1 hour). | Must Have | System |
| FR-SCHED-04 | System shall allow drag-and-drop rescheduling of assignments on the calendar view. | Could Have | Project Manager, Supervisor |
| FR-SCHED-05 | Technicians shall be able to view their own schedule filtered by day/week. | Must Have | Technician |

## 8.12 Materials Tracking

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-MAT-01 | System shall allow recording of Estimated Materials per Project (derived from the Quotation/Site Inspection), including item name, quantity, and unit. | Must Have | Project Manager |
| FR-MAT-02 | System shall allow recording of Actual Materials Used per Project as work progresses, entered by Supervisor or Technician. | Must Have | Supervisor, Technician |
| FR-MAT-03 | System shall calculate and display Material Variance (Estimated vs. Actual) per Project. | Should Have | System |
| FR-MAT-04 | System shall link Material usage to the associated Task where applicable. | Could Have | Supervisor |
| FR-MAT-05 | System shall support attaching supplier/purchase receipts (photo/PDF) to Material entries. | Should Have | Supervisor, Accountant |

## 8.13 Expense Management

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-EXP-01 | System shall allow recording of Project-linked expenses (materials, transport, labor subcontracting, miscellaneous) with category, amount, date, and receipt attachment. | Must Have | Supervisor, Project Manager, Accountant |
| FR-EXP-02 | System shall allow recording of general (non-project) operating expenses. | Should Have | Accountant, Admin |
| FR-EXP-03 | System shall support an Expense approval workflow: `Submitted → Approved → Rejected`, with Accountant/Admin as approver. | Must Have | Accountant, Admin |
| FR-EXP-04 | System shall aggregate total expenses per Project for profitability calculation (Project Revenue − Project Expenses). | Must Have | System |
| FR-EXP-05 | System shall support expense categorization (Material, Labor, Transport, Equipment Rental, Other) for reporting. | Must Have | System |

## 8.14 Invoices

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-INV-01 | System shall generate an Invoice from an approved Quotation or a Completed Project, pre-filled with agreed line items and total. | Must Have | Accountant, Admin |
| FR-INV-02 | System shall support partial/milestone invoicing (e.g., 50% advance, 50% on completion) with multiple invoices per Project. | Must Have | Accountant |
| FR-INV-03 | System shall auto-generate a unique Invoice number (e.g., `INV-2026-00042`) and a downloadable PDF. | Must Have | System |
| FR-INV-04 | Each Invoice shall have a status: `Draft → Sent → Partially Paid → Paid → Overdue → Cancelled`. | Must Have | System |
| FR-INV-05 | System shall automatically mark an Invoice Overdue when the due date passes without full payment. | Must Have | System |
| FR-INV-06 | System shall send Invoices to Customers via the portal and email notification. | Must Have | System |
| FR-INV-07 | Customers shall be able to view and download their Invoices via the customer portal. | Must Have | Customer |
| FR-INV-08 | System shall support Invoice cancellation/void with a mandatory reason, retaining the record for audit purposes (no hard delete). | Must Have | Accountant, Admin |

## 8.15 Payments

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-PAY-01 | System shall allow recording of Payments received against an Invoice: amount, date, payment method (Cash, Bank Transfer, Cheque, Card), and reference number. | Must Have | Accountant |
| FR-PAY-02 | System shall support partial payments, automatically updating the Invoice's outstanding balance and status. | Must Have | System |
| FR-PAY-03 | System shall generate a Payment Receipt (PDF) for each recorded payment. | Must Have | System |
| FR-PAY-04 | System shall maintain a full Payment history per Customer and per Project. | Must Have | System |
| FR-PAY-05 | System shall prevent recording a payment amount that exceeds the Invoice's outstanding balance (validation error). | Must Have | System |
| FR-PAY-06 | System shall allow recording of Advance/Deposit payments prior to Invoice generation, applying them against the first Invoice issued. | Should Have | Accountant |
| FR-PAY-07 | Customers shall be able to view their own payment history via the customer portal. | Must Have | Customer |

## 8.16 Reports

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-REP-01 | System shall provide a Revenue Report (by day/week/month/quarter/year, filterable by service category). | Must Have | Super Admin, Admin, Accountant |
| FR-REP-02 | System shall provide a Project Profitability Report (revenue − expenses per Project, with margin %). | Must Have | Super Admin, Admin, Accountant |
| FR-REP-03 | System shall provide a Technician Productivity Report (tasks completed, on-time rate, average completion time). | Should Have | Super Admin, Admin, Project Manager |
| FR-REP-04 | System shall provide an Outstanding Receivables Report (unpaid/partially paid invoices, aged by days overdue). | Must Have | Super Admin, Admin, Accountant |
| FR-REP-05 | System shall provide a Quotation Conversion Report (quotations sent vs. approved vs. rejected, conversion rate). | Should Have | Super Admin, Admin, Project Manager |
| FR-REP-06 | System shall support exporting any report to PDF and CSV/Excel. | Must Have | System |
| FR-REP-07 | System shall provide a Customer Satisfaction Report based on post-completion feedback ratings (see 8.17 notifications for feedback trigger). | Could Have | Super Admin, Admin |

## 8.17 Notifications

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-NOTIF-01 | System shall send in-app notifications for key events: new Service Request assigned, Inspection scheduled, Quotation sent/approved/rejected, Task assigned, Project status change, Invoice issued, Payment received. | Must Have | System |
| FR-NOTIF-02 | System shall send email notifications mirroring critical in-app notifications (Quotation sent, Invoice issued, Payment receipt). | Must Have | System |
| FR-NOTIF-03 | System shall provide a Notification Center (bell icon) showing unread/read notifications per user. | Must Have | All Roles |
| FR-NOTIF-04 | System shall trigger a post-completion feedback request notification to the Customer upon Project closure. | Should Have | System |
| FR-NOTIF-05 | Notification architecture shall be provider-agnostic (email today; SMS/WhatsApp providers pluggable in future, per Section 15). | Must Have | System |

## 8.18 Settings

| ID | Requirement | Priority | Actor(s) |
|---|---|---|---|
| FR-SET-01 | System shall allow configuration of Company Profile (name, logo, address, tax registration number) used on quotations/invoices. | Must Have | Super Admin |
| FR-SET-02 | System shall allow configuration of Tax Rate(s) and default Currency. | Must Have | Super Admin |
| FR-SET-03 | System shall allow management of Users and Roles (create, edit, deactivate). | Must Have | Super Admin, Admin |
| FR-SET-04 | System shall allow configuration of the Service Catalog (Section 8.4). | Must Have | Super Admin, Admin |
| FR-SET-05 | System shall allow configuration of Notification templates (email subject/body placeholders). | Should Have | Super Admin |
| FR-SET-06 | System shall allow configuration of numbering formats/prefixes for Service Requests, Quotations, Projects, Invoices (e.g., prefix, year, sequence padding). | Should Have | Super Admin |
| FR-SET-07 | System shall maintain a System Audit Log viewer, filterable by user, module, and date range. | Must Have | Super Admin |

---

# 9. Non-Functional Requirements

## 9.1 Performance
- API response time shall not exceed 500ms (p95) for standard read operations under normal load (up to 100 concurrent users).
- Dashboard pages shall achieve a Largest Contentful Paint (LCP) under 2.5 seconds on a standard broadband connection.
- File uploads (site inspection photos) shall support files up to 10MB each, with client-side compression before upload where feasible.
- Database queries shall be optimized with appropriate indexes; list endpoints shall implement pagination (default page size 20, max 100).

## 9.2 Security
- All traffic shall be served over HTTPS/TLS 1.2+ only; HTTP requests shall be redirected.
- Passwords shall be hashed using bcrypt (or equivalent, minimum cost factor 10) — never stored in plaintext.
- JWT access tokens shall be short-lived (default 15 minutes); refresh tokens shall be stored securely (httpOnly, secure, SameSite cookies) and rotated on use.
- All API inputs shall be validated and sanitized server-side to prevent SQL Injection, XSS, and command injection (Prisma parameterized queries mitigate SQLi by design).
- RBAC shall be enforced at the API middleware layer for every protected endpoint, not solely in the frontend.
- File uploads shall be validated for file type and scanned for size limits before storage in Supabase Storage.
- Sensitive configuration (database credentials, JWT secrets) shall be stored in environment variables, never committed to source control.
- Rate limiting shall be applied to authentication endpoints to mitigate brute-force attacks.

## 9.3 Scalability
- The backend shall be stateless (session state held in JWT/refresh tokens and database, not in-process memory) to support horizontal scaling behind Nginx/PM2 cluster mode.
- The database schema shall support multi-branch/multi-location data segregation via a `branch_id` (or equivalent) foreign key on relevant entities, even if V1 operates a single branch.
- The architecture shall support introduction of caching (e.g., Redis) for high-read endpoints (dashboards, reports) without requiring API contract changes.

## 9.4 Availability
- Target system uptime: 99.5% monthly, excluding scheduled maintenance windows.
- Scheduled maintenance shall be communicated in advance and performed during low-usage hours.
- The system shall degrade gracefully — e.g., if the notification service fails, core transactional operations (creating a quotation, recording a payment) shall still succeed.

## 9.5 Maintainability
- Codebase shall follow a modular, layered architecture (routes → controllers → services → repositories/Prisma) to isolate business logic from HTTP concerns.
- All code shall be written in TypeScript with strict mode enabled, and linted/formatted consistently (ESLint + Prettier).
- Database schema changes shall be managed exclusively through Prisma Migrate, with all migrations version-controlled.

## 9.6 Reliability
- All financial operations (invoice generation, payment recording) shall be executed within database transactions to prevent partial/inconsistent state.
- The system shall implement idempotency for critical write operations exposed to retries (e.g., payment recording) where feasible.

## 9.7 Accessibility
- The frontend shall target WCAG 2.1 Level AA compliance for color contrast, keyboard navigation, and screen-reader label support, particularly for the Customer portal.
- All interactive elements (buttons, form fields) shall have accessible labels via shadcn/ui and semantic HTML.

## 9.8 Usability
- The Technician interface shall be optimized for mobile-first use (large touch targets, minimal text entry, camera-based photo capture).
- Forms shall provide inline validation with clear, actionable error messages.
- The system shall support a consistent design system (Tailwind CSS + shadcn/ui components) across all modules.

## 9.9 Backup
- The Supabase PostgreSQL database shall be backed up automatically on a daily basis, with backups retained for a minimum of 30 days.
- Supabase Storage assets (photos, documents) shall be included in the backup/retention policy or covered by Supabase's built-in redundancy.

## 9.10 Recovery
- Recovery Point Objective (RPO): maximum 24 hours of data loss in a disaster scenario.
- Recovery Time Objective (RTO): system shall be restorable to operational status within 4 hours of a critical failure.
- A documented disaster recovery runbook shall be maintained and tested at least semi-annually.

## 9.11 Logging
- All API requests shall be logged with timestamp, user ID, endpoint, response status, and response time (excluding sensitive payload data such as passwords).
- Application errors shall be logged with stack traces to a centralized log store, retained for a minimum of 90 days.

## 9.12 Monitoring
- The production environment shall be monitored for uptime, CPU/memory utilization, and error rates, with alerting configured for critical thresholds.
- Nginx and PM2 process health shall be monitored, with automatic process restart on crash (PM2 built-in behavior).

## 9.13 Audit Trail
- All create/update/delete operations on financially or operationally sensitive entities (Quotations, Invoices, Payments, Projects, Users) shall be recorded in an immutable Audit Log table capturing: actor, action, entity type, entity ID, before/after values (where applicable), and timestamp.
- The Audit Log shall be viewable by Super Admin via the Settings module (FR-SET-07) and shall not be editable or deletable through the application layer.

---

# 10. Business Rules

## 10.1 Projects
- BR-PROJ-01: A Project can only be created from an **Approved** Quotation; no Project may exist without a linked Quotation.
- BR-PROJ-02: A Project must have exactly one Project Manager assigned at all times; reassignment requires Admin approval.
- BR-PROJ-03: A Project cannot be marked `Completed` while any of its Tasks remain in `To Do`, `Assigned`, or `In Progress` status.
- BR-PROJ-04: A Project cannot be marked `Closed` until all associated Invoices are `Paid` or explicitly written off by an Admin with documented reason.
- BR-PROJ-05: Placing a Project `On Hold` or `Cancelled` requires a mandatory reason code and free-text note.

## 10.2 Payments
- BR-PAY-01: The sum of all Payments recorded against an Invoice must never exceed the Invoice total.
- BR-PAY-02: A Payment record, once created, cannot be deleted — only voided/reversed with a linked reversal entry, preserving full audit history.
- BR-PAY-03: An Invoice is automatically marked `Paid` only when the cumulative recorded Payments equal or exceed the Invoice total.
- BR-PAY-04: Only users with the Accountant, Admin, or Super Admin role may record or reverse a Payment.

## 10.3 Quotations
- BR-QUOTE-01: Once a Quotation is Approved by the Customer, its line items and total become immutable; any change requires creating a new Quotation Version.
- BR-QUOTE-02: A discount exceeding a configurable threshold (default 15%) requires Admin or Super Admin approval before the Quotation can be sent to the Customer.
- BR-QUOTE-03: A Quotation not approved within its validity period (default 15 days) automatically transitions to `Expired` status and cannot be approved thereafter without being re-issued.
- BR-QUOTE-04: Only one Quotation per Service Request may be in `Sent` (awaiting customer response) status at a time.

## 10.4 Customers
- BR-CUST-01: A customer record may not be hard-deleted if it has any associated Service Request, Quotation, Project, or Invoice; it may only be deactivated.
- BR-CUST-02: Phone number and email, in combination, must be unique per active Customer record.

## 10.5 Technicians
- BR-TECH-01: A Technician cannot be assigned to a Task if they are already assigned to another Task with an overlapping time window, unless explicitly overridden by a Supervisor/Project Manager with a logged justification.
- BR-TECH-02: A Technician marked `Inactive` or `On Leave` shall not appear in the assignable Technician list for new Task assignments during that period.

## 10.6 Expenses
- BR-EXP-01: An Expense exceeding a configurable threshold (default set by Admin) requires Accountant or Admin approval before it is included in Project cost calculations.
- BR-EXP-02: Rejected Expenses are retained in the system (not deleted) with status `Rejected` and a mandatory rejection reason, for audit purposes.

## 10.7 Materials
- BR-MAT-01: Actual Materials Used entries must reference a valid Project and, where applicable, a valid Task within that Project.
- BR-MAT-02: A Material Variance exceeding a configurable threshold (e.g., 20% over estimate) shall trigger a notification to the Project Manager for review.

## 10.8 Invoices
- BR-INV-01: An Invoice can only be generated against a Project with at least one Approved Quotation line item basis.
- BR-INV-02: The sum of all Invoices issued against a single Project shall not exceed the total agreed Quotation amount unless an approved Change Order/Quotation Revision increases the agreed amount.
- BR-INV-03: A `Paid` Invoice cannot be edited; corrections require issuing a Credit Note or a new adjustment Invoice.
- BR-INV-04: Invoice due dates default to 15 days from issue date unless otherwise configured per customer or project agreement.

---

# 11. Success Metrics

The following Key Performance Indicators (KPIs) shall be tracked within the Reports module (Section 8.16) to measure the success of the SMS post-launch:

| KPI | Definition | Target (Post-Launch, 6 Months) |
|---|---|---|
| Monthly Revenue | Total invoiced amount recognized per calendar month. | Trackable in real time; baseline established in Month 1. |
| Completed Projects | Count of Projects reaching `Closed` status per month. | Increase of 15% vs. pre-SMS manual tracking baseline. |
| Customer Satisfaction | Average post-completion feedback rating (1–5 scale). | ≥ 4.2 average rating. |
| Average Completion Time | Average number of days from Project `Scheduled` to `Completed`. | Reduce by 20% vs. historical average. |
| Technician Productivity | Average tasks completed on-time per Technician per week. | Establish baseline in Month 1; improve 10% by Month 6. |
| Project Profitability | Average margin % (Revenue − Expenses) / Revenue across all closed Projects. | Visibility established; target margin defined by Finance per service line. |
| Quotation Turnaround Time | Average time from Site Inspection completion to Quotation sent. | Under 24 hours. |
| Quotation Conversion Rate | % of Sent Quotations that reach Approved status. | ≥ 60%. |
| Days Sales Outstanding (DSO) | Average number of days to collect payment after Invoice issuance. | Reduce by 25% vs. pre-SMS baseline. |

---

# 12. Risks

## 12.1 Business Risks
- Staff resistance to adopting a digital system after years of manual/verbal processes, leading to low adoption and continued shadow spreadsheets.
- Incomplete or inaccurate historical data migration causing loss of trust in the new system's reports.

## 12.2 Technical Risks
- Underestimated complexity in the Quotation-to-Invoice-to-Payment financial chain leading to data integrity bugs if transactions are not properly scoped.
- Supabase Storage or PostgreSQL service outages impacting availability, given reliance on a third-party managed platform.
- Schema design decisions made early (e.g., service catalog structure) proving too rigid for future service line expansion.

## 12.3 Operational Risks
- Field Technicians in low-connectivity site locations unable to update task status in real time (mitigated in future by offline mode, Section 15).
- Insufficient training leading to incorrect data entry (e.g., wrong payment amounts, missed material entries).

## 12.4 Financial Risks
- Inaccurate profitability reporting if Expense entry is inconsistent or delayed by field staff, undermining the Financial Objectives in Section 4.4.
- Budget overrun on the development project itself if scope creep occurs beyond this PRD's defined In Scope items (Section 5.1).

## 12.5 Security Risks
- Unauthorized access to sensitive customer/financial data if RBAC is misconfigured or improperly enforced at the API layer.
- Exposure of JWT secrets or database credentials due to misconfiguration of environment variables in deployment.
- Insecure direct object reference (IDOR) vulnerabilities if entity ownership checks are not enforced alongside role checks (e.g., a Customer accessing another Customer's Invoice by guessing an ID).

---

# 13. Assumptions

- The company will designate at least one internal "Super Admin" owner responsible for initial system configuration (company profile, service catalog, tax settings) prior to go-live.
- Customers have access to a smartphone or computer with internet access and an email address to use the Customer Portal.
- Field Technicians will have access to smartphones with camera and internet connectivity while on-site (V1 assumes online connectivity; offline mode is a future enhancement per Section 15).
- Historical data (existing customers, in-progress projects) will be migrated via a one-time import process; the scope and format of legacy data will be confirmed during the discovery phase.
- The company operates in a single currency and primarily English-speaking business context for V1.
- Supabase (PostgreSQL + Storage) is an acceptable managed infrastructure dependency for the business, including its data residency and pricing model.
- Tax calculation requirements are limited to a single configurable tax rate (e.g., VAT/GST) per invoice; complex multi-jurisdictional tax logic is not required for V1.
- The company will provide sample historical quotations/invoices to inform PDF template design.

---

# 14. Constraints

## 14.1 Budget
- Development shall be scoped to fit within the initial project budget approved by the Company Owner; features beyond Section 5.1 (In Scope) require a formal change request and budget review.

## 14.2 Timeline
- The project shall follow a phased delivery approach (see Appendix 18.3 for suggested architecture-aligned phasing); target for a Minimum Viable Product (MVP) covering Authentication, Customer Management, Service Requests, Quotations, and Projects is prioritized first.

## 14.3 Technology
- The technology stack is fixed as specified in this PRD (Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Node.js, Express.js, Supabase PostgreSQL, Prisma ORM, JWT, Supabase Storage, Docker, PM2, Nginx, Swagger/OpenAPI). Deviations require explicit stakeholder approval.

## 14.4 Resources
- Development requires, at minimum, full-stack engineering capacity, a UI/UX designer for the Customer Portal and Technician mobile views, and a QA resource for acceptance testing against Section 16.

## 14.5 Infrastructure
- The system depends on Supabase-hosted PostgreSQL and Storage as managed services; infrastructure design must account for Supabase's connection limits and storage quotas at the selected pricing tier.
- Production deployment targets a Docker-containerized environment with Nginx as reverse proxy and PM2 as the Node.js process manager, as specified in the Technology Stack.

---

# 15. Future Enhancements

The following are identified as high-value enhancements beyond Version 1.0, to be prioritized in future roadmap planning:

| Enhancement | Description |
|---|---|
| **AI Features** | AI-assisted material quantity estimation from site inspection measurements/photos; AI-generated quotation line-item suggestions based on historical pricing data. |
| **Customer Portal (Enhanced)** | Expanded self-service capabilities: online service request tracking with live chat support, digital contract signing. |
| **Mobile Application** | Native iOS/Android apps for Technicians (task management, camera-first workflows) and Customers (quotation approval, project tracking, push notifications). |
| **Inventory Module** | Full stock/warehouse management with SKUs, reorder points, and supplier purchase orders, integrated with Materials Tracking (Section 8.12). |
| **GPS Tracking** | Real-time Technician location tracking for dispatch optimization and estimated arrival time notifications to customers. |
| **Offline Mode** | Offline-first data capture for Technicians in low-connectivity sites, with background synchronization upon reconnection. |
| **WhatsApp Integration** | WhatsApp Business API integration for quotation delivery, appointment reminders, and status notifications, leveraging the provider-agnostic notification architecture (FR-NOTIF-05). |
| **SMS Integration** | SMS gateway integration for critical alerts (payment due, appointment reminders) to customers without smartphone/email access. |
| **Email Automation** | Automated drip campaigns for follow-up on unconverted Quotations and post-project review requests. |
| **Analytics Dashboard** | Advanced BI-style dashboard with trend analysis, cohort analysis of customer repeat business, and predictive revenue forecasting. |
| **Predictive Maintenance** | For applicable service lines (e.g., CCTV systems), proactive maintenance reminder scheduling based on installation date and typical service intervals. |

---

# 16. Acceptance Criteria

Acceptance Criteria are expressed in Given/When/Then format for each core module. These criteria define the measurable definition of "done" for QA sign-off.

## 16.1 Authentication
- **Given** a registered user with valid credentials, **when** they submit the login form, **then** they receive a valid JWT access token and refresh token, and are redirected to their role-specific dashboard.
- **Given** an expired access token, **when** the client calls a protected API using a valid refresh token, **then** the system issues a new access token and rotates the refresh token.
- **Given** 5 consecutive failed login attempts, **when** the 6th attempt is made within the lockout window, **then** the system rejects the attempt with an account-locked message.

## 16.2 Customer Management
- **Given** an Admin creates a Customer with a phone number already in use by an active Customer, **when** they submit the form, **then** the system displays a duplicate-warning and blocks silent duplicate creation.
- **Given** an existing Customer with linked Projects, **when** an Admin attempts to delete the record, **then** the system prevents hard deletion and offers deactivation instead (per BR-CUST-01).

## 16.3 Service Requests
- **Given** a Customer submits a new Service Request, **when** the request is saved, **then** it receives a unique reference number and the assigned Admin/Project Manager receives a notification within 1 minute.

## 16.4 Site Inspection
- **Given** a Site Inspector completes an inspection checklist with photos and measurements, **when** they submit it, **then** the record becomes read-only for editing by the Inspector and visible to the Project Manager for quotation preparation.

## 16.5 Quotation Management
- **Given** a Quotation in `Sent` status, **when** the Customer clicks Approve, **then** the Quotation status changes to `Approved`, becomes immutable (BR-QUOTE-01), and a "Convert to Project" action becomes available to the Project Manager.
- **Given** a Quotation past its validity period without action, **when** the daily expiry check runs, **then** its status automatically changes to `Expired`.

## 16.6 Project Management
- **Given** a Project with one or more incomplete Tasks, **when** a Project Manager attempts to mark the Project `Completed`, **then** the system blocks the action with a validation message listing incomplete Tasks (BR-PROJ-03).

## 16.7 Task Management
- **Given** a Technician assigned to a Task, **when** they mark it `Completed` with at least one uploaded photo, **then** the Task becomes visible in the Supervisor's verification queue.

## 16.8 Invoices & Payments
- **Given** an Invoice with an outstanding balance of $500, **when** an Accountant attempts to record a payment of $600, **then** the system rejects the entry with a validation error (BR-PAY-01).
- **Given** an Invoice fully paid via one or more Payments, **when** the final Payment is recorded, **then** the Invoice status automatically updates to `Paid` (BR-PAY-03).

## 16.9 Reports
- **Given** a completed Project with recorded Expenses and an Invoice marked Paid, **when** the Project Profitability Report is generated, **then** it correctly displays Revenue, Expenses, and Margin % for that Project, exportable to PDF and CSV.

## 16.10 Notifications
- **Given** a Quotation is sent to a Customer, **when** the action completes, **then** the Customer receives both an in-app notification and an email within 2 minutes.

## 16.11 Security / RBAC
- **Given** a user with the Technician role, **when** they attempt to call an API endpoint reserved for Accountant (e.g., record payment), **then** the system returns HTTP 403 Forbidden.
- **Given** a Customer, **when** they attempt to access another Customer's Invoice by ID via the API, **then** the system returns HTTP 403/404 rather than exposing the record (IDOR mitigation).

---

# 17. Glossary

| Term | Definition |
|---|---|
| **SMS** | Service Management System — the platform defined in this document (not to be confused with Short Message Service). |
| **RBAC** | Role-Based Access Control — an authorization model restricting system access based on a user's assigned role. |
| **JWT** | JSON Web Token — a compact, signed token format used for authenticating API requests. |
| **Refresh Token** | A long-lived token used to obtain new short-lived access tokens without requiring re-login. |
| **ORM** | Object-Relational Mapping — a technique/library (Prisma) that maps database records to application objects. |
| **Service Request** | An initial customer-submitted or staff-logged inquiry for a service, prior to inspection and quotation. |
| **Site Inspection** | A scheduled visit to a customer's site to gather measurements, photos, and conditions needed to prepare an accurate quotation. |
| **Quotation** | A formal, itemized price offer sent to a customer for approval, based on inspection findings. |
| **Project** | A confirmed body of work created after quotation approval, tracked through execution to completion. |
| **Task** | A discrete unit of work within a Project, assignable to one or more Technicians. |
| **Technician** | Field staff who perform the physical installation/maintenance work. |
| **Supervisor** | Staff responsible for overseeing on-site execution and verifying completed Tasks. |
| **Site Inspector** | Staff responsible for conducting Site Inspections and recording findings. |
| **Invoice** | A formal request for payment issued to a customer, derived from an approved Quotation or completed Project. |
| **Payment** | A recorded transaction of funds received from a customer against an Invoice. |
| **Material Variance** | The difference between estimated and actual materials used on a Project. |
| **Audit Trail** | An immutable, chronological record of system actions used for accountability and dispute resolution. |
| **MoSCoW** | A prioritization technique: Must Have, Should Have, Could Have, Won't Have (this release). |
| **KPI** | Key Performance Indicator — a measurable value indicating business performance. |
| **DSO** | Days Sales Outstanding — average number of days taken to collect payment after a sale/invoice. |
| **RPO / RTO** | Recovery Point Objective / Recovery Time Objective — disaster recovery metrics for acceptable data loss and downtime. |
| **IDOR** | Insecure Direct Object Reference — a security vulnerability where an attacker accesses another user's data by manipulating an identifier. |
| **PDF** | Portable Document Format — used for quotations, invoices, and receipts export. |
| **API** | Application Programming Interface — the interface through which the frontend and external systems interact with the backend. |
| **SKU** | Stock-Keeping Unit — a unique identifier for a distinct inventory item (relevant to the Future Scope Inventory Module, not V1). |

---

# 18. Appendix

## 18.1 Abbreviations

| Abbreviation | Meaning |
|---|---|
| SMS | Service Management System |
| PRD | Product Requirements Document |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token |
| ORM | Object-Relational Mapping |
| API | Application Programming Interface |
| REST | Representational State Transfer |
| CRUD | Create, Read, Update, Delete |
| CI/CD | Continuous Integration / Continuous Deployment |
| SDLC | Software Development Life Cycle |
| QA | Quality Assurance |
| KPI | Key Performance Indicator |
| DSO | Days Sales Outstanding |
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| WCAG | Web Content Accessibility Guidelines |
| PDF | Portable Document Format |
| CSV | Comma-Separated Values |
| PM | Project Manager |
| UI/UX | User Interface / User Experience |

## 18.2 References

- OpenAPI Specification (Swagger) — used for API documentation as defined in the Technology Stack.
- WCAG 2.1 Guidelines — referenced for Accessibility non-functional requirements (Section 9.7).
- Prisma ORM Documentation — reference for schema/migration conventions.
- Supabase Documentation — reference for PostgreSQL and Storage service capabilities and limits.

## 18.3 Architecture Overview

**High-Level System Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  Next.js (TypeScript, Tailwind CSS, shadcn/ui, TanStack Query)   │
│  - Role-based Dashboards   - Customer Portal   - Admin Console   │
└───────────────────────────────┬────────────────────────────────┘
                                 │ HTTPS (REST, JSON)
┌───────────────────────────────▼────────────────────────────────┐
│                         Nginx (Reverse Proxy / TLS)               │
└───────────────────────────────┬────────────────────────────────┘
                                 │
┌───────────────────────────────▼────────────────────────────────┐
│                Backend API (Node.js + Express.js + TypeScript)   │
│  - Auth Middleware (JWT + Refresh Token + RBAC)                  │
│  - Controllers → Services → Prisma Repository Layer              │
│  - Swagger/OpenAPI Documentation                                 │
│  - Managed via PM2 (cluster mode), containerized via Docker      │
└───────────┬─────────────────────────────────────┬───────────────┘
            │                                      │
┌───────────▼───────────────┐          ┌───────────▼───────────────┐
│   Supabase PostgreSQL      │          │      Supabase Storage      │
│   (via Prisma ORM)         │          │  (photos, PDFs, documents) │
└─────────────────────────────┘          └─────────────────────────┘
```

**Core Domain Entity Relationship (Conceptual)**

```
Customer 1───* ServiceRequest 1───1 SiteInspection
                     │
                     └──1───* Quotation (versioned) ──1───1 Project
                                                            │
                                          ┌─────────────────┼─────────────────┐
                                          │                 │                 │
                                       Task(s)         Material(s)        Invoice(s)
                                          │                                    │
                                     TechnicianAssignment              Payment(s)
                                                                              │
                                                                        Expense(s) (Project-linked)
```

**Suggested Phased Delivery (Architecture-Aligned, non-binding on timeline per Section 14.2)**

| Phase | Modules |
|---|---|
| Phase 1 — Foundation | Authentication/RBAC, Company Settings, User Management, Customer Management |
| Phase 2 — Pre-Sales | Service Catalog, Service Requests, Site Inspection, Quotation Management |
| Phase 3 — Delivery | Project Management, Task Management, Technician Management, Scheduling |
| Phase 4 — Finance | Materials Tracking, Expense Management, Invoices, Payments |
| Phase 5 — Insight & Polish | Reports/Analytics, Notifications, Dashboards refinement, Audit Log viewer |

## 18.4 Project Summary

The Service Management System (SMS) is an enterprise-grade platform that digitizes the full lifecycle of a services-only installation and maintenance business — from initial customer inquiry through site inspection, quotation, project execution, and final payment collection. Built on a modern, scalable stack (Next.js, Node.js/Express, TypeScript, Supabase PostgreSQL via Prisma, JWT-based RBAC authentication, and Docker/PM2/Nginx deployment), the system replaces fragmented, manual, paper- and spreadsheet-based operations with a single, auditable source of truth accessible to eight distinct roles: Super Admin, Admin, Project Manager, Supervisor, Site Inspector, Technician, Accountant, and Customer.

This PRD defines the complete functional and non-functional scope, business rules, data relationships, security posture, and acceptance criteria required to take the SMS from specification to a production-ready release, and establishes a clear roadmap of future enhancements to guide the platform's evolution beyond Version 1.0.

---

# ROLE DEFINITIONS

The following section provides the complete, detailed definition of each of the 8 user roles referenced throughout this PRD, including responsibilities, permissions, restrictions, and workflow.

## R1. Super Admin

**Responsibilities**
- Overall ownership and configuration of the SMS platform.
- Initial system setup: company profile, tax settings, service catalog, numbering formats.
- Creation and management of all other user accounts, including other Admins.
- Final authority on business-rule threshold configuration (e.g., discount approval limits, expense approval limits).
- Access to full system Audit Log.

**Permissions**
- Full CRUD access to all modules and entities in the system.
- Can create, edit, deactivate any user account of any role.
- Can configure Settings (Section 8.18) in full.
- Can view all financial reports and the complete Audit Trail.
- Can override business rules (e.g., approve discounts beyond threshold) where explicitly permitted by configuration.

**Restrictions**
- Cannot bypass immutable audit logging — all Super Admin actions are themselves logged.
- Cannot hard-delete financially linked records (Invoices, Payments) — only void/reverse per Business Rules (Section 10).

**Workflow**
- Onboards the company (profile, catalog, tax) at system go-live.
- Creates initial Admin and staff accounts.
- Periodically reviews Audit Log and system-wide reports.
- Acts as escalation point for exceptions requiring override authority.

## R2. Admin

**Responsibilities**
- Day-to-day operational administration: managing customers, service requests, quotations, and user accounts below Super Admin level.
- Assigning Project Managers/Supervisors to new projects.
- Approving discounts and expenses within configured thresholds.

**Permissions**
- Full CRUD on Customer Management, Service Requests, Quotations, Projects (assignment), and Reports (view).
- Can create/edit users with roles: Project Manager, Supervisor, Site Inspector, Technician, Accountant (not Super Admin).
- Can configure Service Catalog and view (not necessarily edit) system-wide Settings depending on Super Admin delegation.

**Restrictions**
- Cannot create or edit a Super Admin account.
- Cannot alter core system configuration reserved for Super Admin (e.g., changing the default tax jurisdiction structure) unless explicitly delegated.
- Discount/expense approvals limited to configured thresholds; anything above requires Super Admin.

**Workflow**
- Reviews incoming Service Requests and assigns ownership.
- Reviews and sends Quotations to customers.
- Converts approved Quotations to Projects and assigns Project Managers.
- Monitors dashboards for bottlenecks (unassigned requests, overdue quotations).

## R3. Project Manager

**Responsibilities**
- End-to-end ownership of assigned Projects from creation to closure.
- Breaking Projects into Tasks, defining milestones, and assigning Supervisors/Technicians (via Supervisors or directly).
- Monitoring Project progress, budget (via Expenses/Materials), and timeline.
- Communicating Project status internally and, indirectly, to the Customer via the portal.

**Permissions**
- Full CRUD on Tasks and Milestones within their assigned Projects.
- Can assign/reassign Supervisors and Technicians to Tasks within their Projects.
- Can view and record Expenses and Materials for their Projects.
- Can view Quotations and Site Inspections related to their Projects.
- Can view Project Profitability data for their own Projects.

**Restrictions**
- Cannot access or modify Projects they are not assigned to (enforced via ownership + RBAC checks).
- Cannot record Payments or edit Invoices (Accountant-only functions).
- Cannot create/edit user accounts.

**Workflow**
- Receives a newly converted Project from Admin.
- Defines Tasks and Milestones, assigns Supervisors/Technicians.
- Monitors the Scheduling calendar and Task status board daily.
- Reviews Material Variance and Expense entries submitted by Supervisors.
- Marks Project `Completed` once all Tasks are Verified, subject to Business Rule BR-PROJ-03.

## R4. Supervisor

**Responsibilities**
- On-site oversight of Technicians for assigned Tasks/Projects.
- Verifying Task completion quality before marking `Verified`.
- Recording Actual Materials Used and site-level Expenses.

**Permissions**
- View and update status of Tasks within their assigned Projects.
- Can verify (`Verified` status) Tasks marked Completed by Technicians.
- Can record Materials and Expenses against their assigned Projects.
- Can reopen a Task with a documented reason.

**Restrictions**
- Cannot create new Projects or Quotations.
- Cannot assign a Technician outside of their assigned Project scope.
- Cannot access financial modules (Invoices, Payments) beyond viewing Project-linked Expenses they submitted.

**Workflow**
- Receives Task assignments/oversight responsibility from the Project Manager.
- Conducts daily/periodic site check-ins, reviewing Technician-submitted progress photos.
- Verifies completed Tasks or reopens them with feedback.
- Submits Material usage and Expense entries as work progresses.

## R5. Site Inspector

**Responsibilities**
- Conducting scheduled Site Inspections for new Service Requests.
- Capturing structured measurements, checklist responses, and photos to support accurate Quotation preparation.

**Permissions**
- View assigned Site Inspection schedule.
- Full CRUD on their own Site Inspection records (until submitted, after which the record becomes read-only per FR-INSP-08 workflow).
- Can upload photos and attach notes to inspections.

**Restrictions**
- Cannot view or edit Quotations, Projects, or financial data.
- Cannot self-assign inspections — assignment is made by Admin/Project Manager.
- Cannot edit a submitted inspection record (data integrity for quotation accuracy).

**Workflow**
- Receives inspection assignment notification with site address and service category context.
- Travels to site, completes the category-specific digital checklist, captures measurements and photos.
- Submits the inspection, triggering notification to Admin/Project Manager for quotation preparation.

## R6. Technician

**Responsibilities**
- Executing assigned installation/maintenance Tasks at customer sites.
- Reporting Task progress and completion with photo evidence.
- Logging time spent and materials used (where applicable) against Tasks.

**Permissions**
- View own assigned Tasks and schedule (day/week view).
- Update status of own assigned Tasks (`In Progress`, `Completed`) and add progress notes/photos.
- Log actual Materials Used against own Tasks where delegated by Supervisor.
- Request leave/unavailability (subject to Admin approval).

**Restrictions**
- Cannot view other Technicians' assignments or any financial/customer-contact data beyond what's needed to complete the assigned Task (site address, task instructions).
- Cannot mark a Task `Verified` — this is reserved for Supervisor.
- Cannot access Quotation, Invoice, or Payment data.

**Workflow**
- Logs in, views today's/this week's assigned Tasks on a mobile-friendly dashboard.
- Navigates to site, marks Task `In Progress`, performs the work.
- Uploads before/after photos, marks Task `Completed` with notes.
- Awaits Supervisor verification; addresses feedback if a Task is reopened.

## R7. Accountant

**Responsibilities**
- Managing the full financial lifecycle: Invoice generation, Payment recording, Expense approval, and financial reporting.
- Ensuring accurate, timely reconciliation of customer receivables.

**Permissions**
- Full CRUD on Invoices and Payments.
- Approve/Reject submitted Expenses.
- View all financial Reports (Revenue, Profitability, Receivables).
- View Customer and Project records (read-only) for financial context.

**Restrictions**
- Cannot create or edit Quotations, Projects, or Tasks.
- Cannot assign Technicians or manage Scheduling.
- Cannot create/edit user accounts (view-only, if granted, for staff directory purposes).

**Workflow**
- Reviews Projects reaching Invoicing-eligible milestones and generates Invoices.
- Sends Invoices to Customers and tracks payment status.
- Records incoming Payments as they are received, reconciling against bank/cash records.
- Reviews and approves/rejects submitted Expenses from Supervisors/Project Managers.
- Produces periodic financial reports for Super Admin/Admin/Company Owner review.

## R8. Customer

**Responsibilities**
- Submitting Service Requests describing their installation/maintenance needs.
- Reviewing and approving/rejecting Quotations in a timely manner.
- Making payments per agreed Invoice terms.
- Providing post-completion feedback.

**Permissions**
- Full CRUD on their own profile and site addresses.
- Create new Service Requests; view status of their own Service Requests, Quotations, Projects, Invoices, and Payments.
- Approve or Reject Quotations issued to them, with optional comments.
- Download PDF copies of their own Quotations, Invoices, and Payment Receipts.
- Submit post-completion feedback/ratings.

**Restrictions**
- Cannot view any other Customer's data (strict data isolation, enforced against IDOR per Section 9.2/16.11).
- Cannot access internal operational data (Technician assignments, internal notes, Expenses, internal Reports).
- Cannot directly edit a Quotation, Invoice, or Project status — these are system/staff-driven with the Customer limited to approval/rejection actions where applicable.

**Workflow**
- Registers/logs into the Customer Portal.
- Submits a Service Request describing the desired service.
- Is notified when a Site Inspection is scheduled and, later, when a Quotation is ready.
- Reviews the Quotation, approves or rejects it (with comments).
- Tracks Project progress via the portal following approval.
- Receives and pays Invoices per agreed terms; views Payment history.
- Submits feedback upon Project completion.

---

*End of Document — Service Management System (SMS) Product Requirements Document, Version 1.0.*

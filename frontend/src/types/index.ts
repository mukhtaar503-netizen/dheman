// Mirrors the Role enum in backend/prisma/schema.prisma
export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PROJECT_MANAGER'
  | 'SUPERVISOR'
  | 'SITE_INSPECTOR'
  | 'TECHNICIAN'
  | 'ACCOUNTANT'
  | 'CUSTOMER';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
}

export type CustomerType = 'INDIVIDUAL' | 'CORPORATE';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type CustomerSource = 'WALK_IN' | 'REFERRAL' | 'WEBSITE' | 'SOCIAL_MEDIA' | 'ADVERTISEMENT' | 'PHONE_INQUIRY' | 'OTHER';
export type PreferredContactMethod = 'PHONE' | 'EMAIL' | 'SMS' | 'WHATSAPP';
export type CustomerNoteVisibility = 'INTERNAL' | 'PUBLIC';
export type CustomerDocumentCategory = 'CONTRACT' | 'INVOICE' | 'PHOTO' | 'DRAWING' | 'RECEIPT' | 'WARRANTY' | 'IDENTITY' | 'OTHER';

export interface Customer {
  id: string;
  customerCode: string;
  fullName: string;
  companyName?: string | null;
  type: CustomerType;
  email?: string | null;
  phone: string;
  alternatePhone?: string | null;
  nationalId?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth?: string | null;
  preferredContactMethod?: PreferredContactMethod;
  billingAddress?: string | null;
  source: CustomerSource;
  status: CustomerStatus;
  assignedTechnicianId?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  siteAddresses?: CustomerSiteAddress[];
}

export interface CustomerSiteAddress {
  id: string;
  label: string;
  addressLine: string;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  street?: string | null;
  building?: string | null;
  postalCode?: string | null;
  landmark?: string | null;
  mapLocation?: string | null;
  isDefault: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface CustomerContact {
  id: string;
  name: string;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface CustomerNote {
  id: string;
  note: string;
  visibility: CustomerNoteVisibility;
  isPinned: boolean;
  attachments: string[];
  createdAt: string;
  author?: { id: string; fullName: string } | null;
}

export interface CustomerDocument {
  id: string;
  category: CustomerDocumentCategory;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  version: number;
  replacesId?: string | null;
  createdAt: string;
  uploadedBy?: { id: string; fullName: string } | null;
}

export interface CustomerTimelineEvent {
  type: string;
  message: string;
  at: string;
  actorId?: string | null;
}

export interface CustomerPayment {
  id: string;
  amount: number;
  method: string;
  referenceNo?: string | null;
  paidAt: string;
  runningBalance: number;
}

export interface CustomerStats {
  outstandingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  overdueInvoiceCount: number;
  projectsCurrentCount: number;
  projectsCompletedCount: number;
  projectsCancelledCount: number;
}

export interface CustomerDetail extends Customer {
  contacts: CustomerContact[];
  notes: CustomerNote[];
  documents: CustomerDocument[];
  serviceRequests: { id: string; status: string; createdAt: string }[];
  quotations: { id: string; quotationNo: string; status: string; total: number; createdAt: string }[];
  projectsCurrent: { id: string; projectNo: string; status: string; completionPercent: number; createdAt: string }[];
  projectsCompleted: { id: string; projectNo: string; status: string; completionPercent: number; createdAt: string }[];
  projectsCancelled: { id: string; projectNo: string; status: string; completionPercent: number; createdAt: string }[];
  invoices: { id: string; invoiceNo: string; status: string; total: number; balance: number; dueDate: string; createdAt: string }[];
  paymentTimeline: CustomerPayment[];
  stats: CustomerStats;
  timeline: CustomerTimelineEvent[];
  assignedTechnician?: { id: string; fullName: string; email: string } | null;
}

export interface CustomerStatistics {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  blockedCustomers: number;
  businessCustomers: number;
  individualCustomers: number;
  newCustomersThisMonth: number;
  customersWithActiveProjects: number;
  customersWithOutstandingPayments: number;
  topCustomers: { customerId: string; fullName: string; companyName: string | null; customerCode: string | null; totalPaid: number }[];
  monthlyRegistrations: { month: string; count: number }[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type DateRangePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface KpiCard {
  key: string;
  label: string;
  value: number;
  previousValue?: number;
  percentChange?: number | null;
  secondaryValue?: number;
  format?: 'number' | 'currency' | 'currency-count';
  href?: string;
}

export interface PerformanceMetrics {
  monthlyRevenue?: number;
  monthlyExpenses?: number;
  netProfit?: number;
  projectCompletionRatePercent?: number | null;
  averageProjectDurationDays?: number | null;
  customerSatisfactionAverage?: number | null;
  outstandingBalance?: number;
  technicianOnTimeRatePercent?: number | null;
}

export interface DashboardSummary {
  role: Role;
  range?: { from: string; to: string };
  cards: KpiCard[];
  performance?: PerformanceMetrics;
}

export interface RevenuePoint {
  period: string;
  revenue: number;
}

export interface ProjectStatPoint {
  status: string;
  count: number;
}

export interface ExpensePoint {
  period: string;
  [category: string]: string | number;
}

export interface ServiceSlice {
  name: string;
  value: number;
}

export type ActivityType = 'LOGIN' | 'NEW_CUSTOMER' | 'NEW_QUOTATION' | 'PROJECT_COMPLETED' | 'PAYMENT';

export interface ActivityItem {
  type: ActivityType;
  at: string;
  id: string;
  description: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  referenceNo?: string | null;
  paidAt: string;
  customer: { id: string; fullName: string };
  invoice: { id: string; invoiceNo: string };
}

export type ServiceCategoryGroup = 'FURNITURE' | 'ALUMINUM' | 'CCTV' | 'PVC' | 'MOVING';
export type ServiceStatus = 'ACTIVE' | 'INACTIVE';

export interface Service {
  id: string;
  serviceName: string;
  category: ServiceCategoryGroup;
  description?: string | null;
  durationMinutes?: number | null;
  estimatedCost?: string | number | null;
  requiredMaterials: string[];
  features: string[];
  imageUrl?: string | null;
  displayOrder: number;
  notes?: string | null;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceStatistics {
  totalServices: number;
  activeServices: number;
  inactiveServices: number;
  byCategory: { category: ServiceCategoryGroup; count: number }[];
  recentlyAdded: Service[];
  mostFrequentlyUsed: (Service & { usageCount: number })[];
}

// ── PHASE 06: Service Requests & Site Inspections ────────────────────────────

export type ServiceRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ServiceRequestStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'SITE_INSPECTION_SCHEDULED'
  | 'INSPECTION_COMPLETED'
  | 'QUOTATION_SENT'
  | 'APPROVED'
  | 'CONVERTED_TO_PROJECT'
  | 'REJECTED'
  | 'CANCELLED'
  | 'CLOSED';
export type InspectionStatus = 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AttachmentType = 'PHOTO' | 'VIDEO' | 'DRAWING' | 'DOCUMENT';

export interface ServiceRequestAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

export interface InspectionMeasurement {
  id: string;
  label: string;
  length?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;
  unit?: string | null;
  quantity?: number | null;
  area?: string | number | null;
  notes?: string | null;
}

export interface InspectionPhoto {
  id: string;
  fileUrl: string;
  fileType: AttachmentType;
  caption?: string | null;
  createdAt: string;
}

export interface MaterialEstimateRow {
  material: string;
  quantity: string;
  unit?: string;
  estimatedCost?: number;
  remarks?: string;
}

export interface LaborEstimateRow {
  task: string;
  workers?: number;
  days?: number;
  cost: number;
}

export interface SiteInspection {
  id: string;
  inspectionNo: string;
  serviceRequestId: string;
  inspectorId: string;
  inspector?: { id: string; fullName: string };
  scheduledAt: string;
  status: InspectionStatus;
  siteAddress?: string | null;
  city?: string | null;
  region?: string | null;
  accessNotes?: string | null;
  materialEstimate?: MaterialEstimateRow[] | null;
  laborEstimate?: LaborEstimateRow[] | null;
  materialCost?: string | number | null;
  laborCost?: string | number | null;
  transportationCost?: string | number | null;
  estimatedCost?: string | number | null;
  estimatedDuration?: string | null;
  estimatedWorkers?: number | null;
  estimatedWorkingDays?: number | null;
  specialSkillsRequired?: string | null;
  vehicleRequired?: string | null;
  transportDistance?: string | number | null;
  accessibility?: string | null;
  transportationNotes?: string | null;
  cancelReason?: string | null;
  submittedAt?: string | null;
  measurements?: InspectionMeasurement[];
  photos?: InspectionPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface CompletedInspectionOption {
  id: string;
  serviceRequestId: string;
  customer: { id: string; name: string };
  service: { name: string };
  inspectionDate: string;
  completedAt?: string | null;
  materialCost: number | null;
  laborCost: number | null;
  transportationCost: number | null;
  estimatedCost: number | null;
  estimatedDuration: string | null;
}

export interface ServiceRequest {
  id: string;
  referenceNo: string;
  customerId: string;
  serviceCategoryId: string;
  serviceId?: string | null;
  title?: string | null;
  description: string;
  projectLocation?: string | null;
  projectType?: string | null;
  expectedStartDate?: string | null;
  expectedCompletionDate?: string | null;
  siteAddressId?: string | null;
  preferredContactTime?: string | null;
  preferredDate?: string | null;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  ownerId?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  serviceCategory?: { id: string; name: string };
  service?: Service | null;
  attachments?: ServiceRequestAttachment[];
  inspection?: SiteInspection | null;
  quotations?: { id: string; quotationNo: string; status: string; total: number | string; createdAt: string }[];
}

export interface ServiceRequestStatistics {
  totalRequests: number;
  pendingRequests: number;
  scheduledInspections: number;
  completedInspections: number;
  averageInspectionCost: number | null;
  byStatus: { status: ServiceRequestStatus; count: number }[];
  byPriority: { priority: ServiceRequestPriority; count: number }[];
  monthlyTrend: { month: string; count: number }[];
}

// ── PHASE 07: Quotation Management ───────────────────────────────────────────

export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVISED' | 'CANCELLED';
export type QuotationItemCategory = 'MATERIAL' | 'LABOR' | 'TRANSPORTATION';
export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type QuotationApprovalAction = 'APPROVED' | 'REJECTED';

export interface QuotationLineItem {
  id: string;
  quotationId: string;
  serviceCategoryId?: string | null;
  serviceId?: string | null;
  category: QuotationItemCategory;
  itemName?: string | null;
  description: string;
  quantity: number | string;
  unit: string;
  unitPrice: number | string;
  subtotal: number | string;
}

export interface QuotationApproval {
  id: string;
  quotationId: string;
  customerId: string;
  action: QuotationApprovalAction;
  comments?: string | null;
  approvedDate: string;
  createdAt: string;
}

export interface QuotationAuditLogEntry {
  id: string;
  quotationId: string;
  action: string;
  actorId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface Quotation {
  id: string;
  quotationNo: string;
  serviceRequestId: string;
  siteInspectionId?: string | null;
  customerId: string;
  version: number;
  status: QuotationStatus;
  title?: string | null;
  description?: string | null;
  materialCost: number | string;
  laborCost: number | string;
  transportationCost: number | string;
  subtotal: number | string;
  taxRatePercent: number | string;
  taxAmount: number | string;
  discountType?: DiscountType | null;
  discountValue?: number | string | null;
  discountAmount: number | string;
  discountReason?: string | null;
  discountApprovedById?: string | null;
  total: number | string;
  validityDays?: number | null;
  validUntil?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  sentAt?: string | null;
  respondedAt?: string | null;
  customerComment?: string | null;
  emailSentAt?: string | null;
  emailStatus?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  serviceRequest?: ServiceRequest;
  siteInspection?: SiteInspection | null;
  createdBy?: { id: string; fullName: string } | null;
  lineItems?: QuotationLineItem[];
  auditLogs?: QuotationAuditLogEntry[];
  approvals?: QuotationApproval[];
}

export interface QuotationStatistics {
  totalQuotations: number;
  draftQuotations: number;
  sentQuotations: number;
  approvedQuotations: number;
  rejectedQuotations: number;
  totalRevenueValue: number;
  approvalRatePercent: number | null;
  byStatus: { status: QuotationStatus; count: number }[];
  monthlyValue: { month: string; value: number }[];
}

export interface QuotationPrefill {
  serviceRequest: ServiceRequest;
  customer: Customer;
  siteInspection: SiteInspection;
  suggestedLineItems: {
    category: QuotationItemCategory;
    itemName: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }[];
}

export interface CompanySettings {
  id: string;
  name: string;
  tagline?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxRegistrationNo?: string | null;
  taxRatePercent: number | string;
  currency: string;
  quotationValidityDays: number;
}

export type ProjectStatus = 'PLANNING' | 'SCHEDULED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';

// Staff Registration feature — responsibility a staff member holds on a Project.
export type StaffResponsibility =
  | 'SUPERVISOR'
  | 'TECHNICIAN'
  | 'INSTALLER'
  | 'ELECTRICIAN'
  | 'CARPENTER'
  | 'PLUMBER'
  | 'PAINTER'
  | 'DRIVER'
  | 'HELPER'
  | 'OTHER';

export interface StaffUser {
  id: string;
  fullName: string;
  employeeId?: string | null;
  role: Role;
  phone?: string | null;
  department?: string | null;
}

export interface ProjectStaffAssignment {
  id: string;
  projectId: string;
  userId: string;
  responsibility: StaffResponsibility;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  assignedById?: string | null;
  createdAt: string;
  updatedAt: string;
  user: StaffUser;
  assignedBy?: { id: string; fullName: string } | null;
}

export interface Project {
  id: string;
  projectNo: string;
  quotationId: string;
  customerId: string;
  status: ProjectStatus;
  projectManagerId?: string | null;
  startDate?: string | null;
  targetEndDate?: string | null;
  actualEndDate?: string | null;
  holdReason?: string | null;
  cancelReason?: string | null;
  completionPercent: number | string;
  customerSignOffAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  projectManager?: { id: string; fullName: string; email?: string } | null;
  staffAssignments: ProjectStaffAssignment[];
  milestones: { id: string; name: string; targetDate?: string | null; completedAt?: string | null; status: string }[];
  documents: { id: string; fileUrl: string; fileName: string; createdAt: string }[];
  tasks: { id: string; title: string; status: string }[];
  invoices: { id: string; status: string }[];
}

// Employee Management — built on top of the existing User/staff identity (same
// records already used for login, RBAC, and Staff Registration on Projects).
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
export type EmployeeDocumentCategory = 'ID_CARD' | 'CONTRACT' | 'CERTIFICATE' | 'RESUME' | 'OTHER';

export interface Employee {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  employeeId?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  address?: string | null;
  hireDate?: string | null;
  photoUrl?: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDocument {
  id: string;
  category: EmployeeDocumentCategory;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  createdAt: string;
  uploadedBy?: { id: string; fullName: string } | null;
}

export interface EmployeeDetail extends Employee {
  technicianProfile?: { id: string; skills: string[]; employmentType: string; status: string } | null;
  employeeDocuments: EmployeeDocument[];
}

export interface EmployeeStatistics {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  onLeaveEmployees: number;
  byDepartment: { department: string; count: number }[];
}

export interface AuditLogEntry {
  id: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  actor?: { id: string; fullName: string; email: string; role: Role } | null;
}

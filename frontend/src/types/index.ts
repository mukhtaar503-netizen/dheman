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
export type InspectionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

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
  unit: string;
  area?: string | number | null;
}

export interface InspectionPhoto {
  id: string;
  fileUrl: string;
  caption?: string | null;
  createdAt: string;
}

export interface MaterialEstimateRow {
  material: string;
  quantity: string;
  estimatedCost: number;
}

export interface LaborEstimateRow {
  task: string;
  estimatedHours: number;
  cost: number;
}

export interface SiteInspection {
  id: string;
  serviceRequestId: string;
  inspectorId: string;
  inspector?: { id: string; fullName: string };
  scheduledAt: string;
  status: InspectionStatus;
  accessNotes?: string | null;
  technicalNotes?: string | null;
  materialEstimate?: MaterialEstimateRow[] | null;
  laborEstimate?: LaborEstimateRow[] | null;
  estimatedCost?: string | number | null;
  estimatedDuration?: string | null;
  cancelReason?: string | null;
  submittedAt?: string | null;
  measurements?: InspectionMeasurement[];
  photos?: InspectionPhoto[];
  createdAt: string;
  updatedAt: string;
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

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

export interface Customer {
  id: string;
  fullName: string;
  companyName?: string | null;
  email?: string | null;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
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

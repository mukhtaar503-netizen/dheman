import { api } from '@/lib/api-client';
import type {
  ActivityItem,
  Customer,
  DashboardSummary,
  ExpensePoint,
  Notification,
  PaginatedResult,
  Payment,
  ProjectStatPoint,
  RevenuePoint,
  ServiceSlice,
} from '@/types';

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

export const dashboardApi = {
  summary: (params: Record<string, string | undefined>) => api.get<DashboardSummary>(`/dashboard/summary${qs(params)}`),
  revenue: (params: Record<string, string | undefined>) => api.get<RevenuePoint[]>(`/dashboard/revenue${qs(params)}`),
  projects: (params: Record<string, string | undefined>) => api.get<ProjectStatPoint[]>(`/dashboard/projects${qs(params)}`),
  expenses: (params: Record<string, string | undefined>) => api.get<ExpensePoint[]>(`/dashboard/expenses${qs(params)}`),
  services: () => api.get<ServiceSlice[]>('/dashboard/services'),
  activity: (page: number, pageSize: number) => api.get<PaginatedResult<ActivityItem>>(`/dashboard/activity${qs({ page, pageSize })}`),
  customers: (page: number, pageSize: number, search?: string) =>
    api.get<PaginatedResult<Customer>>(`/dashboard/customers${qs({ page, pageSize, search })}`),
  payments: (params: Record<string, string | number | undefined>) => api.get<PaginatedResult<Payment>>(`/dashboard/payments${qs(params)}`),
  loginActivity: (page: number, pageSize: number) => api.get<PaginatedResult<Record<string, unknown>>>(`/dashboard/login-activity${qs({ page, pageSize })}`),
};

export const notificationsApi = {
  list: (unreadOnly = false) => api.get<Notification[]>(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  markRead: (id: string) => api.post<Notification>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ updated: number }>('/notifications/read-all'),
};

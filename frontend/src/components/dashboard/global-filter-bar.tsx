'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useDashboardFilterStore } from '@/stores/dashboard-filter-store';
import { RangeFilter } from './range-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Customer, PaginatedResult } from '@/types';

const PROJECT_STATUSES = ['PLANNING', 'SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED'];
const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];

interface ServiceCategory {
  id: string;
  name: string;
}
interface TechnicianOption {
  id: string;
  user: { id: string; fullName: string };
}
interface ProjectOption {
  id: string;
  projectNo: string;
}

/**
 * Global dashboard filters. Date Range drives every KPI/chart query directly.
 * Service Type highlights the matching slice in the Service Distribution chart.
 * Customer/Project/Technician/Payment Status/Project Status update shared
 * Zustand state now — wiring them into every widget's query is a fast follow;
 * today they're consumed by the module list pages (e.g. Projects reads
 * ?status= from the URL).
 */
export function GlobalFilterBar() {
  const { customerId, projectId, technicianId, serviceCategoryId, paymentStatus, projectStatus, setFilter } = useDashboardFilterStore();

  const { data: customers } = useQuery({ queryKey: ['filter-customers'], queryFn: () => api.get<PaginatedResult<Customer>>('/customers?page=1&pageSize=100') });
  const { data: projects } = useQuery({ queryKey: ['filter-projects'], queryFn: () => api.get<PaginatedResult<ProjectOption>>('/projects?page=1&pageSize=100') });
  const { data: technicians } = useQuery({ queryKey: ['filter-technicians'], queryFn: () => api.get<TechnicianOption[]>('/technicians') });
  const { data: categories } = useQuery({ queryKey: ['filter-service-categories'], queryFn: () => api.get<ServiceCategory[]>('/service-categories') });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RangeFilter />

      <FilterSelect placeholder="Customer" value={customerId} onChange={(v) => setFilter('customerId', v)}>
        {customers?.items.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.fullName}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect placeholder="Project" value={projectId} onChange={(v) => setFilter('projectId', v)}>
        {projects?.items.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.projectNo}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect placeholder="Technician" value={technicianId} onChange={(v) => setFilter('technicianId', v)}>
        {technicians?.map((t) => (
          <SelectItem key={t.id} value={t.user.id}>
            {t.user.fullName}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect placeholder="Service Type" value={serviceCategoryId} onChange={(v) => setFilter('serviceCategoryId', v)}>
        {categories?.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect placeholder="Payment Status" value={paymentStatus} onChange={(v) => setFilter('paymentStatus', v)}>
        {INVOICE_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s.replaceAll('_', ' ')}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect placeholder="Project Status" value={projectStatus} onChange={(v) => setFilter('projectStatus', v)}>
        {PROJECT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s.replaceAll('_', ' ')}
          </SelectItem>
        ))}
      </FilterSelect>
    </div>
  );
}

function FilterSelect({
  placeholder,
  value,
  onChange,
  children,
}: {
  placeholder: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  children: React.ReactNode;
}) {
  return (
    <Select value={value ?? '__all__'} onValueChange={(v) => onChange(v === '__all__' ? undefined : v)}>
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All {placeholder}s</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}

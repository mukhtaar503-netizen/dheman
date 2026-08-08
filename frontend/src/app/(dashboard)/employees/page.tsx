'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/ui/pagination';
import type { Employee, EmployeeStatistics, PaginatedResult, Role } from '@/types';

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  ON_LEAVE: 'destructive',
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'SITE_INSPECTOR', label: 'Site Inspector' },
  { value: 'TECHNICIAN', label: 'Technician' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
];

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatisticsRow() {
  const { data, isLoading } = useQuery({
    queryKey: ['employee-statistics'],
    queryFn: () => api.get<EmployeeStatistics>('/users/statistics'),
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Total Employees" value={data.totalEmployees} />
      <StatTile label="Active" value={data.activeEmployees} />
      <StatTile label="Inactive" value={data.inactiveEmployees} />
      <StatTile label="On Leave" value={data.onLeaveEmployees} />
    </div>
  );
}

function EmployeesList() {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [role, setRole] = React.useState<string>('all');
  const [status, setStatus] = React.useState<string>('all');
  const [sort, setSort] = React.useState('newest');
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', { search: debouncedSearch, role, status, sort, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (role !== 'all') params.set('role', role);
      if (status !== 'all') params.set('status', status);
      return api.get<PaginatedResult<Employee>>(`/users?${params.toString()}`);
    },
  });

  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{data ? `${data.total} employees` : 'Employees'}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name, email, phone, Employee ID…"
            className="h-8 w-64 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={role}
            onValueChange={(v) => {
              setRole(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="ON_LEAVE">On Leave</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => router.push('/employees/new')}>
            <Plus className="mr-1 h-4 w-4" /> New Employee
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-56 w-full" />}
        {data && items.length === 0 && <EmptyState title="No employees found" description="Try adjusting your search or filters." />}
        {data && items.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((employee) => (
                  <TableRow key={employee.id} className="cursor-pointer" onClick={() => router.push(`/employees/${employee.id}`)}>
                    <TableCell className="font-mono text-xs">{employee.employeeId ?? '—'}</TableCell>
                    <TableCell className="font-medium">{employee.fullName}</TableCell>
                    <TableCell>{employee.jobTitle ?? '—'}</TableCell>
                    <TableCell>{employee.department ?? '—'}</TableCell>
                    <TableCell>{employee.phone ?? '—'}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.role.replaceAll('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[employee.status] ?? 'secondary'}>{employee.status.replaceAll('_', ' ')}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={pageSize} total={data.total} onPageChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Employees</h1>
      <React.Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <StatisticsRow />
      </React.Suspense>
      <EmployeesList />
    </div>
  );
}

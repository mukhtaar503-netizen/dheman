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

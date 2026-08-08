import type { Role } from '@/types';

export interface NavItem {
  href: string;
  label: string;
  roles?: Role[];
}

// Role mapping for this ERP dashboard's "Admin / Manager / Technician / Sales" personas,
// expressed over the PRD's actual 8-role model (see docs/SMS-PRD.md Role Definitions):
//   Admin      -> SUPER_ADMIN, ADMIN
//   Manager    -> PROJECT_MANAGER (SUPERVISOR gets an overlapping subset)
//   Sales      -> ADMIN (owns quotations/customers in this system; no separate Sales role exists)
//   Technician -> TECHNICIAN
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Customers', roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'] },
  { href: '/service-requests', label: 'Service Requests', roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'CUSTOMER'] },
  { href: '/site-inspections', label: 'Site Inspections', roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'SITE_INSPECTOR'] },
  { href: '/services', label: 'Services', roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'SUPERVISOR'] },
  { href: '/quotations', label: 'Quotations', roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'SITE_INSPECTOR', 'CUSTOMER'] },
  { href: '/projects', label: 'Projects', roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'SUPERVISOR'] },
  { href: '/technicians', label: 'Technicians', roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'SUPERVISOR'] },
  { href: '/employees', label: 'Employees', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/invoices', label: 'Invoices & Payments', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
];

import { Role } from '@prisma/client';

/**
 * Canonical permission catalog. Every key here becomes a seeded AppPermission
 * row (prisma/seed.ts), grouped into `module` for the roles/permissions admin
 * UI. DEFAULT_ROLE_PERMISSIONS reproduces exactly what each of the system's
 * 8 roles could already do via the old requireRole(...) route gates — this
 * mapping is the seed data for RolePermission, so migrating to the dynamic
 * system does not change anyone's access on day one. From there, an
 * Super Admin can grant/revoke permissions per role, or assign additional
 * roles to a user, via the /roles and /users/:id/roles endpoints.
 */
export const PERMISSIONS = {
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view',

  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_MANAGE: 'customers.manage',
  CUSTOMERS_DEACTIVATE: 'customers.deactivate',
  CUSTOMERS_DELETE: 'customers.delete',
  CUSTOMERS_EXPORT: 'customers.export',
  CUSTOMERS_STATISTICS_VIEW: 'customers.statistics-view',

  SERVICE_CATEGORIES_MANAGE: 'service-categories.manage',
  SERVICE_REQUESTS_MANAGE: 'service-requests.manage',

  INSPECTIONS_SUBMIT: 'inspections.submit',
  INSPECTIONS_MANAGE: 'inspections.manage',

  QUOTATIONS_MANAGE: 'quotations.manage',
  QUOTATIONS_APPROVE_DISCOUNT: 'quotations.approve-discount',

  PROJECTS_VIEW: 'projects.view',
  PROJECTS_MANAGE: 'projects.manage',

  TASKS_EXECUTE: 'tasks.execute',
  TASKS_MANAGE: 'tasks.manage',

  TECHNICIANS_MANAGE: 'technicians.manage',
  TECHNICIANS_APPROVE_LEAVE: 'technicians.approve-leave',

  MATERIALS_MANAGE: 'materials.manage',

  EXPENSES_SUBMIT: 'expenses.submit',
  EXPENSES_APPROVE: 'expenses.approve',

  INVOICES_MANAGE: 'invoices.manage',
  PAYMENTS_MANAGE: 'payments.manage',

  REPORTS_VIEW: 'reports.view',

  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_FINANCE_VIEW: 'dashboard.finance-view',
  DASHBOARD_LOGIN_ACTIVITY_VIEW: 'dashboard.login-activity-view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

interface PermissionDef {
  key: PermissionKey;
  module: string;
  description: string;
}

function def(key: PermissionKey, module: string, description: string): PermissionDef {
  return { key, module, description };
}

export const PERMISSION_CATALOG: PermissionDef[] = [
  def(PERMISSIONS.USERS_MANAGE, 'users', 'Create/list/update internal staff users'),
  def(PERMISSIONS.ROLES_MANAGE, 'rbac', 'Manage roles, permissions, and role assignments'),
  def(PERMISSIONS.SETTINGS_MANAGE, 'settings', 'Update company settings'),
  def(PERMISSIONS.AUDIT_VIEW, 'audit', 'View the system audit log'),

  def(PERMISSIONS.CUSTOMERS_READ, 'customers', 'View customer records'),
  def(PERMISSIONS.CUSTOMERS_MANAGE, 'customers', 'Create/update customer records, addresses, contacts, notes, and documents'),
  def(PERMISSIONS.CUSTOMERS_DEACTIVATE, 'customers', 'Deactivate a customer record'),
  def(PERMISSIONS.CUSTOMERS_DELETE, 'customers', 'Soft-delete/restore customer records, including bulk operations'),
  def(PERMISSIONS.CUSTOMERS_EXPORT, 'customers', 'Export customer records to CSV'),
  def(PERMISSIONS.CUSTOMERS_STATISTICS_VIEW, 'customers', 'View customer dashboard statistics'),

  def(PERMISSIONS.SERVICE_CATEGORIES_MANAGE, 'service-categories', 'Manage the service catalog'),
  def(PERMISSIONS.SERVICE_REQUESTS_MANAGE, 'service-requests', 'Create/update Service Requests on behalf of customers'),

  def(PERMISSIONS.INSPECTIONS_SUBMIT, 'inspections', 'Submit Site Inspection findings'),
  def(PERMISSIONS.INSPECTIONS_MANAGE, 'inspections', 'Schedule/reschedule Site Inspections'),

  def(PERMISSIONS.QUOTATIONS_MANAGE, 'quotations', 'Create/send/revise Quotations'),
  def(PERMISSIONS.QUOTATIONS_APPROVE_DISCOUNT, 'quotations', 'Approve a discount above the configured threshold'),

  def(PERMISSIONS.PROJECTS_VIEW, 'projects', 'View Projects'),
  def(PERMISSIONS.PROJECTS_MANAGE, 'projects', 'Create/update Projects, milestones, and documents'),

  def(PERMISSIONS.TASKS_EXECUTE, 'tasks', 'View and execute assigned Tasks'),
  def(PERMISSIONS.TASKS_MANAGE, 'tasks', 'Create/assign/verify/reopen Tasks'),

  def(PERMISSIONS.TECHNICIANS_MANAGE, 'technicians', 'View/manage the Technician roster and scheduling'),
  def(PERMISSIONS.TECHNICIANS_APPROVE_LEAVE, 'technicians', 'Approve/reject Technician leave requests'),

  def(PERMISSIONS.MATERIALS_MANAGE, 'materials', 'Record material estimates/usage'),

  def(PERMISSIONS.EXPENSES_SUBMIT, 'expenses', 'Submit Expenses'),
  def(PERMISSIONS.EXPENSES_APPROVE, 'expenses', 'Approve/reject Expenses'),

  def(PERMISSIONS.INVOICES_MANAGE, 'invoices', 'Generate/send/void Invoices'),
  def(PERMISSIONS.PAYMENTS_MANAGE, 'payments', 'Record/reverse Payments'),

  def(PERMISSIONS.REPORTS_VIEW, 'reports', 'View business reports'),

  def(PERMISSIONS.DASHBOARD_VIEW, 'dashboard', 'View the internal dashboard'),
  def(PERMISSIONS.DASHBOARD_FINANCE_VIEW, 'dashboard', 'View financial dashboard widgets'),
  def(PERMISSIONS.DASHBOARD_LOGIN_ACTIVITY_VIEW, 'dashboard', 'View the login activity feed'),
];

/** Seed mapping: role name -> permission keys. Reproduces pre-refactor access exactly. */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  [Role.SUPER_ADMIN]: PERMISSION_CATALOG.map((p) => p.key),
  [Role.ADMIN]: [
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.CUSTOMERS_DEACTIVATE,
    PERMISSIONS.CUSTOMERS_DELETE,
    PERMISSIONS.CUSTOMERS_EXPORT,
    PERMISSIONS.CUSTOMERS_STATISTICS_VIEW,
    PERMISSIONS.SERVICE_CATEGORIES_MANAGE,
    PERMISSIONS.SERVICE_REQUESTS_MANAGE,
    PERMISSIONS.INSPECTIONS_SUBMIT,
    PERMISSIONS.INSPECTIONS_MANAGE,
    PERMISSIONS.QUOTATIONS_MANAGE,
    PERMISSIONS.QUOTATIONS_APPROVE_DISCOUNT,
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.PROJECTS_MANAGE,
    PERMISSIONS.TASKS_EXECUTE,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.TECHNICIANS_MANAGE,
    PERMISSIONS.TECHNICIANS_APPROVE_LEAVE,
    PERMISSIONS.MATERIALS_MANAGE,
    PERMISSIONS.EXPENSES_SUBMIT,
    PERMISSIONS.EXPENSES_APPROVE,
    PERMISSIONS.INVOICES_MANAGE,
    PERMISSIONS.PAYMENTS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_FINANCE_VIEW,
  ],
  [Role.PROJECT_MANAGER]: [
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.CUSTOMERS_EXPORT,
    PERMISSIONS.CUSTOMERS_STATISTICS_VIEW,
    PERMISSIONS.SERVICE_REQUESTS_MANAGE,
    PERMISSIONS.INSPECTIONS_MANAGE,
    PERMISSIONS.QUOTATIONS_MANAGE,
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.PROJECTS_MANAGE,
    PERMISSIONS.TASKS_EXECUTE,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.TECHNICIANS_MANAGE,
    PERMISSIONS.MATERIALS_MANAGE,
    PERMISSIONS.EXPENSES_SUBMIT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_FINANCE_VIEW,
  ],
  [Role.SUPERVISOR]: [
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.TASKS_EXECUTE,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.TECHNICIANS_MANAGE,
    PERMISSIONS.MATERIALS_MANAGE,
    PERMISSIONS.EXPENSES_SUBMIT,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  [Role.SITE_INSPECTOR]: [PERMISSIONS.INSPECTIONS_SUBMIT, PERMISSIONS.DASHBOARD_VIEW],
  [Role.TECHNICIAN]: [PERMISSIONS.MATERIALS_MANAGE, PERMISSIONS.TASKS_EXECUTE, PERMISSIONS.DASHBOARD_VIEW],
  [Role.ACCOUNTANT]: [
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_STATISTICS_VIEW,
    PERMISSIONS.EXPENSES_SUBMIT,
    PERMISSIONS.EXPENSES_APPROVE,
    PERMISSIONS.INVOICES_MANAGE,
    PERMISSIONS.PAYMENTS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_FINANCE_VIEW,
  ],
  [Role.CUSTOMER]: [],
};

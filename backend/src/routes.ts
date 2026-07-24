import { Router } from 'express';
import authRoutes from '@/modules/auth/auth.routes';
import usersRoutes from '@/modules/users/users.routes';
import customersRoutes from '@/modules/customers/customers.routes';
import settingsRoutes from '@/modules/settings/settings.routes';
import serviceCategoriesRoutes from '@/modules/service-categories/service-categories.routes';
import serviceRequestsRoutes from '@/modules/service-requests/service-requests.routes';
import inspectionsRoutes from '@/modules/inspections/inspections.routes';
import quotationsRoutes from '@/modules/quotations/quotations.routes';
import projectsRoutes from '@/modules/projects/projects.routes';
import tasksRoutes from '@/modules/tasks/tasks.routes';
import techniciansRoutes from '@/modules/technicians/technicians.routes';
import materialsRoutes from '@/modules/materials/materials.routes';
import expensesRoutes from '@/modules/expenses/expenses.routes';
import invoicesRoutes from '@/modules/invoices/invoices.routes';
import paymentsRoutes from '@/modules/payments/payments.routes';
import notificationsRoutes from '@/modules/notifications/notifications.routes';
import reportsRoutes from '@/modules/reports/reports.routes';
import auditRoutes from '@/modules/audit/audit.routes';

const router = Router();

// Phase 1 — Foundation
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/customers', customersRoutes);
router.use('/settings', settingsRoutes);

// Phase 2 — Pre-Sales
router.use('/service-categories', serviceCategoriesRoutes);
router.use('/service-requests', serviceRequestsRoutes);
router.use('/inspections', inspectionsRoutes);
router.use('/quotations', quotationsRoutes);

// Phase 3 — Delivery
router.use('/projects', projectsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/technicians', techniciansRoutes);

// Phase 4 — Finance
router.use('/materials', materialsRoutes);
router.use('/expenses', expensesRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/payments', paymentsRoutes);

// Phase 5 — Insight & Polish
router.use('/notifications', notificationsRoutes);
router.use('/reports', reportsRoutes);
router.use('/audit-logs', auditRoutes);

export default router;

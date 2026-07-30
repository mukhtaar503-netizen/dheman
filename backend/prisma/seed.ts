import { PrismaClient, Role, ServiceCategoryGroup } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_CATALOG, PERMISSIONS } from '../src/config/permissions';

const prisma = new PrismaClient();

async function main() {
  await prisma.companySettings.upsert({
    where: { id: (await prisma.companySettings.findFirst())?.id ?? '00000000-0000-0000-0000-000000000000' },
    update: {},
    create: {
      name: 'Demo Installation & Maintenance Co.',
      currency: 'USD',
      taxRatePercent: 5,
      quotationValidityDays: 15,
      discountApprovalThreshold: 15,
      expenseApprovalThreshold: 500,
      invoiceDueDays: 15,
    },
  });

  // Dynamic RBAC: one AppRole per Role enum value, one AppPermission per catalog entry,
  // then RolePermission rows reproducing DEFAULT_ROLE_PERMISSIONS exactly.
  const roleRecords = new Map<Role, string>();
  for (const roleName of Object.values(Role)) {
    const appRole = await prisma.appRole.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `System role: ${roleName.replaceAll('_', ' ')}`, isSystem: true },
    });
    roleRecords.set(roleName, appRole.id);
  }

  const permissionRecords = new Map<string, string>();
  for (const permission of PERMISSION_CATALOG) {
    const appPermission = await prisma.appPermission.upsert({
      where: { key: permission.key },
      update: { module: permission.module, description: permission.description },
      create: { key: permission.key, module: permission.module, description: permission.description },
    });
    permissionRecords.set(permission.key, appPermission.id);
  }

  for (const [roleName, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as [Role, string[]][]) {
    const roleId = roleRecords.get(roleName)!;
    for (const key of permissionKeys) {
      const permissionId = permissionRecords.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }
  // Customer Management (Phase 4) named two access profiles — "Sales" and "Reception" —
  // that don't correspond to a fixed Role enum value. Rather than adding new enum
  // members (a breaking change touching JWT claims and every requireRole() check),
  // seed them as ordinary (non-system) AppRoles: an Admin can edit their grants or
  // create further custom roles from the existing Roles & Permissions admin UI.
  const customRoles: { name: string; description: string; permissions: string[] }[] = [
    {
      name: 'Sales',
      description: 'Front-of-house sales: manages customer records and views customer statistics',
      permissions: [
        PERMISSIONS.CUSTOMERS_READ,
        PERMISSIONS.CUSTOMERS_MANAGE,
        PERMISSIONS.CUSTOMERS_EXPORT,
        PERMISSIONS.CUSTOMERS_STATISTICS_VIEW,
        PERMISSIONS.SERVICE_REQUESTS_MANAGE,
        PERMISSIONS.QUOTATIONS_MANAGE,
        PERMISSIONS.DASHBOARD_VIEW,
      ],
    },
    {
      name: 'Reception',
      description: 'Front-desk reception: registers walk-in customers and logs notes, read-only otherwise',
      permissions: [PERMISSIONS.CUSTOMERS_READ, PERMISSIONS.CUSTOMERS_MANAGE, PERMISSIONS.DASHBOARD_VIEW],
    },
  ];
  for (const customRole of customRoles) {
    const appRole = await prisma.appRole.upsert({
      where: { name: customRole.name },
      update: {},
      create: { name: customRole.name, description: customRole.description, isSystem: false },
    });
    for (const key of customRole.permissions) {
      const permissionId = permissionRecords.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: appRole.id, permissionId } },
        update: {},
        create: { roleId: appRole.id, permissionId },
      });
    }
  }

  console.log(`Seeded ${roleRecords.size} roles, ${permissionRecords.size} permissions, ${customRoles.length} custom roles (Sales, Reception).`);

  const superAdminEmail = 'superadmin@sms.local';
  let superAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        fullName: 'System Super Admin',
        passwordHash: await bcrypt.hash('ChangeMe123!', 10),
        role: Role.SUPER_ADMIN,
      },
    });
    console.log(`Seeded Super Admin: ${superAdminEmail} / ChangeMe123!`);
  }

  // Ensure every existing user has a UserRole row matching their primary `role` enum
  // field — covers both the freshly-seeded Super Admin and any pre-existing users
  // from before this RBAC migration.
  const allUsers = await prisma.user.findMany({ select: { id: true, role: true } });
  for (const user of allUsers) {
    const roleId = roleRecords.get(user.role);
    if (!roleId) continue;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    });
  }

  const categories = [
    { name: 'Furniture Installation', code: 'FURNITURE', unitOfMeasure: 'unit' },
    { name: 'Aluminum Installation', code: 'ALUMINUM', unitOfMeasure: 'sq_ft' },
    { name: 'CCTV Installation', code: 'CCTV', unitOfMeasure: 'unit' },
    { name: 'PVC Ceiling Installation', code: 'PVC_CEILING', unitOfMeasure: 'sq_ft' },
    { name: 'PVC Wall Panel Installation', code: 'PVC_WALL_PANEL', unitOfMeasure: 'sq_ft' },
  ];

  for (const category of categories) {
    await prisma.serviceCategory.upsert({
      where: { code: category.code },
      update: {},
      create: category,
    });
  }

  // Phase 05 — the installable-services catalog (distinct from ServiceCategory above).
  const services: {
    serviceName: string;
    category: ServiceCategoryGroup;
    description: string;
    durationMinutes: number;
    estimatedCost: number;
    requiredMaterials: string[];
  }[] = [
    {
      serviceName: 'Kitchen Cabinets',
      category: ServiceCategoryGroup.FURNITURE,
      description: 'Design, build, and install fitted kitchen cabinetry.',
      durationMinutes: 480,
      estimatedCost: 1200,
      requiredMaterials: ['MDF board', 'Cabinet hinges', 'Handles', 'Countertop'],
    },
    {
      serviceName: 'Wardrobes',
      category: ServiceCategoryGroup.FURNITURE,
      description: 'Custom built-in or freestanding wardrobe installation.',
      durationMinutes: 300,
      estimatedCost: 650,
      requiredMaterials: ['MDF board', 'Sliding rails', 'Handles'],
    },
    {
      serviceName: 'Office Furniture',
      category: ServiceCategoryGroup.FURNITURE,
      description: 'Assembly and installation of office desks, storage, and workstations.',
      durationMinutes: 240,
      estimatedCost: 500,
      requiredMaterials: ['Desk frames', 'Panels', 'Fasteners'],
    },
    {
      serviceName: 'Bedroom Furniture',
      category: ServiceCategoryGroup.FURNITURE,
      description: 'Bed frames, nightstands, and dresser installation.',
      durationMinutes: 240,
      estimatedCost: 450,
      requiredMaterials: ['Wood panels', 'Fasteners', 'Drawer slides'],
    },
    {
      serviceName: 'TV Units',
      category: ServiceCategoryGroup.FURNITURE,
      description: 'Custom TV unit and media wall installation.',
      durationMinutes: 180,
      estimatedCost: 350,
      requiredMaterials: ['MDF board', 'Cable management channel', 'Wall mount bracket'],
    },
    {
      serviceName: 'Aluminum Doors',
      category: ServiceCategoryGroup.ALUMINUM,
      description: 'Supply and installation of aluminum-framed doors.',
      durationMinutes: 240,
      estimatedCost: 550,
      requiredMaterials: ['Aluminum profile', 'Glass panel', 'Hinges', 'Locks'],
    },
    {
      serviceName: 'Aluminum Windows',
      category: ServiceCategoryGroup.ALUMINUM,
      description: 'Supply and installation of aluminum-framed windows.',
      durationMinutes: 180,
      estimatedCost: 400,
      requiredMaterials: ['Aluminum profile', 'Glass panel', 'Sealant'],
    },
    {
      serviceName: 'Aluminum Partitions',
      category: ServiceCategoryGroup.ALUMINUM,
      description: 'Office/commercial aluminum-framed partition walls.',
      durationMinutes: 360,
      estimatedCost: 900,
      requiredMaterials: ['Aluminum profile', 'Glass/panel infill', 'Fasteners'],
    },
    {
      serviceName: 'Office Glass Systems',
      category: ServiceCategoryGroup.ALUMINUM,
      description: 'Frameless/semi-framed glass office systems.',
      durationMinutes: 300,
      estimatedCost: 850,
      requiredMaterials: ['Tempered glass', 'Aluminum channel', 'Fittings'],
    },
    {
      serviceName: 'Aluminum Kitchens',
      category: ServiceCategoryGroup.ALUMINUM,
      description: 'Aluminum-framed kitchen cabinet systems.',
      durationMinutes: 480,
      estimatedCost: 1300,
      requiredMaterials: ['Aluminum profile', 'Cabinet panels', 'Hardware'],
    },
    {
      serviceName: 'Camera Installation',
      category: ServiceCategoryGroup.CCTV,
      description: 'Mounting and wiring of CCTV cameras.',
      durationMinutes: 120,
      estimatedCost: 150,
      requiredMaterials: ['CCTV camera', 'Mounting bracket', 'Cabling'],
    },
    {
      serviceName: 'DVR/NVR Installation',
      category: ServiceCategoryGroup.CCTV,
      description: 'DVR/NVR recorder setup and storage configuration.',
      durationMinutes: 90,
      estimatedCost: 200,
      requiredMaterials: ['DVR/NVR unit', 'Hard drive', 'Cabling'],
    },
    {
      serviceName: 'Remote & Network Configuration',
      category: ServiceCategoryGroup.CCTV,
      description: 'Remote viewing app setup and network/port configuration.',
      durationMinutes: 60,
      estimatedCost: 100,
      requiredMaterials: ['Network router access', 'Static IP/DDNS setup'],
    },
    {
      serviceName: 'CCTV System Maintenance',
      category: ServiceCategoryGroup.CCTV,
      description: 'Periodic inspection, cleaning, and repair of an existing CCTV system.',
      durationMinutes: 90,
      estimatedCost: 80,
      requiredMaterials: ['Cleaning kit', 'Replacement cabling (as needed)'],
    },
    {
      serviceName: 'PVC Ceiling Installation',
      category: ServiceCategoryGroup.PVC,
      description: 'PVC ceiling panel supply and installation.',
      durationMinutes: 300,
      estimatedCost: 400,
      requiredMaterials: ['PVC panels', 'Support frame', 'Fasteners'],
    },
    {
      serviceName: 'PVC Wall Panels',
      category: ServiceCategoryGroup.PVC,
      description: 'PVC wall panel supply and installation.',
      durationMinutes: 240,
      estimatedCost: 350,
      requiredMaterials: ['PVC panels', 'Adhesive', 'Trim'],
    },
    {
      serviceName: 'Decorative PVC Designs',
      category: ServiceCategoryGroup.PVC,
      description: 'Decorative/patterned PVC ceiling or wall design work.',
      durationMinutes: 300,
      estimatedCost: 500,
      requiredMaterials: ['Decorative PVC panels', 'LED strip (optional)', 'Fasteners'],
    },
    {
      serviceName: 'PVC Maintenance Services',
      category: ServiceCategoryGroup.PVC,
      description: 'Repair and maintenance of existing PVC ceiling/wall installations.',
      durationMinutes: 120,
      estimatedCost: 120,
      requiredMaterials: ['Replacement panels (as needed)', 'Adhesive'],
    },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { serviceName_category: { serviceName: svc.serviceName, category: svc.category } },
      update: {},
      create: svc,
    });
  }
  console.log(`Seeded ${services.length} services across 4 categories.`);

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

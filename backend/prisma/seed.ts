import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_CATALOG } from '../src/config/permissions';

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
  console.log(`Seeded ${roleRecords.size} roles, ${permissionRecords.size} permissions.`);

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

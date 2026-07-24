import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

  const superAdminEmail = 'superadmin@sms.local';
  const existing = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        fullName: 'System Super Admin',
        passwordHash: await bcrypt.hash('ChangeMe123!', 10),
        role: Role.SUPER_ADMIN,
      },
    });
    console.log(`Seeded Super Admin: ${superAdminEmail} / ChangeMe123!`);
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

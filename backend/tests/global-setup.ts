import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
  const env = { ...process.env };

  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
  execSync('npx prisma db seed', { stdio: 'inherit', env });

  // Start each test run from a clean slate for the tables this suite exercises,
  // so count-based assertions (statistics) aren't polluted by a previous run's data.
  // CASCADE also clears anything referencing Customer (ServiceRequest, Quotation,
  // Project, Invoice, Payment) — fine here since this is a disposable test database.
  const truncateSql = `TRUNCATE "Customer", "User" RESTART IDENTITY CASCADE;`;
  execSync(`psql "${env.DATABASE_URL}" -c '${truncateSql}'`, { stdio: 'inherit' });

  // Re-seed roles/permissions/Super Admin/service categories after the truncate.
  execSync('npx prisma db seed', { stdio: 'inherit', env });
}

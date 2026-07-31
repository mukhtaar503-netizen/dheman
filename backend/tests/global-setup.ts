import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const rootEnvPath = path.resolve(__dirname, '../.env');
const rootEnvBackupPath = path.resolve(__dirname, '../.env.globalsetup-backup');

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
  const env = { ...process.env };

  // The Prisma CLI auto-loads and OVERRIDES with the project's root .env on every
  // invocation, even when a DATABASE_URL is already set in the child process's env
  // (verified directly: `DATABASE_URL=... npx prisma migrate status` still reports
  // the .env database). Without hiding .env here, every command below would silently
  // run against the dev database instead of the isolated test database, and the
  // TRUNCATE further down would wipe real dev data.
  const hadRootEnv = fs.existsSync(rootEnvPath);
  if (hadRootEnv) fs.renameSync(rootEnvPath, rootEnvBackupPath);

  try {
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
  } finally {
    if (hadRootEnv) fs.renameSync(rootEnvBackupPath, rootEnvPath);
  }
}

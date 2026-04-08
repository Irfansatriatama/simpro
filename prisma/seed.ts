import { PrismaClient } from '@prisma/client';
import { createBootstrapAdmin } from '../lib/bootstrap-user';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@sys.id';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_USERNAME = 'admin';

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    console.log(`Seeder: user dengan email ${ADMIN_EMAIL} sudah ada — dilewati.`);
    return;
  }

  const count = await prisma.user.count();
  if (count > 0) {
    console.log('Seeder: database sudah berisi user — lewati seed admin.');
    return;
  }

  const result = await createBootstrapAdmin({
    name: 'Administrator',
    email: ADMIN_EMAIL,
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  console.log(
    `Seeder: admin dibuat — email: ${ADMIN_EMAIL}, username: ${ADMIN_USERNAME}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import { prisma } from '../src/prisma';
import adminsSeed from './seeds/admins.seed';

async function main() {
  await adminsSeed();
}

main()
  .catch((e) => {
    console.error({ error: e });
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());

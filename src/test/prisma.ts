import { prisma } from '../prisma';

type TableNames = { tablename: string };

export async function clearDatabase(schema: string = 'public') {
  // noinspection SqlResolve
  const tableNames = await prisma.$queryRaw<Array<TableNames>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = ${schema}
  `;

  for (const { tablename: tableName } of tableNames) {
    if (tableName === '_prisma_migrations') continue;

    try {
      await prisma.$queryRawUnsafe(`TRUNCATE TABLE "${schema}"."${tableName}" CASCADE;`);
    } catch (e) {
      console.error({ error: e });
    }
  }
}

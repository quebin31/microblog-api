import { prisma } from '../../src/prisma';
import { Role } from '@prisma/client';
import { SignUpData, signUpSchema } from '../../src/schemas/accounts';
import { z } from 'zod';
import { isValidPassword, saltPassword } from '../../src/utils/auth';
import { readFile } from 'fs/promises';

const adminsSchema = z.array(signUpSchema);

export default async function() {
  const adminsFile = process.env.ADMINS_FILE;
  if (adminsFile === undefined) {
    console.log('Skipping seeding of admins as ADMINS_FILE is not defined');
    return;
  }

  console.log(`Seeding admins from file ${adminsFile}`);

  const adminsRaw = JSON.parse(await readFile(adminsFile, { encoding: 'utf-8' }));
  const result = adminsSchema.safeParse(adminsRaw);

  let admins: SignUpData[];
  if (result.success) {
    admins = result.data;
  } else {
    throw new Error(`Invalid admins JSON file ${result.error.format()}`);
  }

  const dataPromises = admins.map(async (admin) => {
    if (!isValidPassword(admin.password)) {
      throw new Error(`Not enough strong password for admin with email ${admin.email}`);
    }

    return {
      ...admin,
      password: await saltPassword(admin.password),
      role: Role.admin,
      verified: true,
      publicEmail: false,
      publicName: true,
    };
  });

  const data = await Promise.all(dataPromises);

  await prisma.user.createMany({ data, skipDuplicates: true });
}

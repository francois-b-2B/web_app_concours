const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const root = path.resolve(__dirname, '..');
require('@next/env').loadEnvConfig(root, true);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const models = ['user', 'account', 'session', 'verificationToken', 'tournament', 'pool', 'team', 'poolMatch', 'bracketMatch'];
  const rows = await prisma.$transaction(models.map(model => prisma[model].findMany()), {
    isolationLevel: 'RepeatableRead',
  });
  const createdAt = new Date().toISOString();
  const backup = {
    format: 'concours-backup',
    version: 1,
    createdAt,
    schema: await fs.readFile(path.join(root, 'prisma/schema.prisma'), 'utf8'),
    data: Object.fromEntries(models.map((model, index) => [model, rows[index]])),
  };
  const directory = path.resolve(root, '../sauvegardes');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, `concours-${createdAt.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.json`);
  const temporary = filename + '.tmp';
  try {
    await fs.writeFile(temporary, JSON.stringify(backup, null, 2), { mode: 0o600, flag: 'wx' });
    const checked = JSON.parse(await fs.readFile(temporary, 'utf8'));
    for (const model of models) {
      if (checked.data[model].length !== backup.data[model].length) throw new Error('Vérification échouée');
    }
    await fs.rename(temporary, filename);
  } catch (error) {
    await fs.unlink(temporary).catch(() => {});
    throw error;
  }
  console.log(`Sauvegarde créée et relue : ${filename}`);
  console.log(`${backup.data.tournament.length} concours, ${backup.data.team.length} équipes.`);
}

main().catch(() => {
  console.error('Sauvegarde impossible. Vérifiez la connexion Internet et la configuration .env. Les anciennes sauvegardes sont conservées.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());

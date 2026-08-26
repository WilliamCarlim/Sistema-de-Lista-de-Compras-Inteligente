import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'Hortifrúti', color: '#22C55E' }, // green
  { name: 'Carnes & Peixes', color: '#EF4444' }, // red
  { name: 'Laticínios & Ovos', color: '#F59E0B' }, // amber
  { name: 'Bebidas', color: '#3B82F6' }, // blue
  { name: 'Limpeza', color: '#A855F7' }, // purple
  { name: 'Higiene', color: '#EC4899' }, // pink
  { name: 'Mercearia/Padaria', color: '#D97706' }, // dark amber
  { name: 'Congelados', color: '#06B6D4' }, // cyan
];

async function main() {
  console.log('Seeding default categories...');
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { color: category.color },
      create: { name: category.name, color: category.color },
    });
  }
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({ select: { id: true, clerkId: true, email: true } });
  console.log('Users in database:', JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());

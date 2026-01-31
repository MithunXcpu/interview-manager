const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const stages = await db.userStage.findMany({
    where: { userId: 'cmkvsqxda00008p2zji1iojml' },
    select: { id: true, stageKey: true, name: true, isEnabled: true, order: true }
  });
  console.log('Stages for user:', JSON.stringify(stages, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.upsert({
    where: { id: "bank_a" },
    update: {},
    create: {
      id: "bank_a",
      name: "NexaBank",
      ifscPrefix: "NEXA",
      branchCode: "0001"
    }
  });

  await prisma.tenant.upsert({
    where: { id: "bank_b" },
    update: {},
    create: {
      id: "bank_b",
      name: "SafeX Bank",
      ifscPrefix: "SAFX",
      branchCode: "0001"
    }
  });
  console.log("Tenants seeded successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());

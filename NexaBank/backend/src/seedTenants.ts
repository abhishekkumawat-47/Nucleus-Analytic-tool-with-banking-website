import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ─── 1. Seed Tenants ─────────────────────────────────────────
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

  console.log("✅ Tenants seeded.");

  // ─── 2. Seed System Customer + System Accounts ───────────────
  // These accounts are needed as FK references for simulation,
  // pro unlock, crypto trades, and external bank transactions.
  const systemEmail = "system@nexabank.internal";
  const hashedPw = await bcrypt.hash("SystemInternal@2026", 10);

  let systemCustomer = await prisma.customer.findUnique({
    where: { email: systemEmail },
  });

  if (!systemCustomer) {
    systemCustomer = await prisma.customer.create({
      data: {
        name: "NexaBank System",
        email: systemEmail,
        phone: "0000000000",
        password: hashedPw,
        dateOfBirth: new Date("2000-01-01"),
        pan: "SYSXX0000S",
        tenantId: "bank_a",
        settingConfig: {},
        address: { city: "System", state: "Internal" },
        role: "ADMIN",
        kycStatus: "VERIFIED",
      },
    });
    console.log("✅ System customer created.");
  }

  // System accounts used across the app
  const systemAccounts = [
    { accNo: "NEXABANK-SYSTEM", label: "Pro License Revenue" },
    { accNo: "NEXABANK-SYSTEM-REVENUE", label: "System Revenue" },
    { accNo: "EXTERNAL-BANK", label: "External Bank Inflows" },
    { accNo: "MERCHANT-ID", label: "Merchant Payments" },
    { accNo: "CRYPTO-EXCHANGE", label: "Crypto Exchange" },
  ];

  for (const sa of systemAccounts) {
    const exists = await prisma.account.findUnique({
      where: { accNo: sa.accNo },
    });
    if (!exists) {
      await prisma.account.create({
        data: {
          accNo: sa.accNo,
          customerId: systemCustomer.id,
          ifsc: "NEXA0001",
          accountType: "CURRENT",
          balance: 0,
        },
      });
      console.log(`  ✅ System account "${sa.accNo}" created (${sa.label}).`);
    }
  }

  // ─── 3. Seed Feature Toggles ─────────────────────────────────
  const defaultToggles = [
    { key: "emi_calculator", tenantId: "bank_a" },
    { key: "kyc", tenantId: "bank_a" },
    { key: "loan_module", tenantId: "bank_a" },
    { key: "pro_features", tenantId: "bank_a" },
    // SafeX Bank toggles for multi-tenant comparison
    { key: "emi_calculator", tenantId: "bank_b" },
    { key: "kyc", tenantId: "bank_b" },
    { key: "loan_module", tenantId: "bank_b" },
    { key: "pro_features", tenantId: "bank_b" },
  ];

  for (const toggle of defaultToggles) {
    await prisma.featureToggle.upsert({
      where: { key_tenantId: { key: toggle.key, tenantId: toggle.tenantId } },
      update: {},
      create: { key: toggle.key, enabled: true, tenantId: toggle.tenantId },
    });
  }

  console.log("✅ Feature toggles seeded.");
  console.log("\n🎉 Seeding complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

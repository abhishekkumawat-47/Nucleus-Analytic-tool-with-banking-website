import { trackEvent } from "./middleware/eventTracker";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

async function run() {
  const count = 30;
  const tenantId = "bank_a";
  
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    console.log("Tenant not found");
    return;
  }

  console.log("Starting simulation for 30 users...");
  const firstNames = ["Aarav", "Priya", "Rahul", "Neha", "Amit", "Sneha", "Vikas", "Pooja", "Rajan", "Divya", "Karan", "Anita", "Suresh", "Meera", "Arjun", "Kavya", "Rohit", "Simran", "Deepak", "Nisha"];
  const lastNames = ["Sharma", "Patel", "Kumar", "Singh", "Verma", "Gupta", "Joshi", "Mehta", "Shah", "Agarwal", "Rao", "Nair", "Iyer", "Pillai", "Reddy"];
  const loanTypes = ["HOME", "AUTO", "PERSONAL", "STUDENT"] as const;

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const ts = Date.now() + i;
    const email = `simX${ts}@nexabank.demo`;
    const phone = `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`;
    const pan = `SIM${String(i).padStart(2, "0")}${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(Math.random() * 9)}`;
    const hashedPw = await bcrypt.hash("SimUser@123", 10);

    const randomDob = new Date(1970 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);

    let customer;
    try {
      customer = await prisma.customer.create({
        data: {
          name, email, phone, password: hashedPw, pan: pan.substring(0, 10).toUpperCase(), tenantId, dateOfBirth: randomDob, settingConfig: {}, address: { street: "Simulated Street", city: "Mumbai", state: "Maharashtra", zip: "400001" },
        },
      });
    } catch {
      continue;
    }

    const ifsc = `${tenant.ifscPrefix}${tenant.branchCode}`;
    await prisma.account.create({
      data: { accNo: `SIM${String(ts).slice(-8)}`, customerId: customer.id, ifsc, accountType: "SAVINGS", balance: Math.floor(Math.random() * 500000) + 10000 },
    });

    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const baseTimestamp = (Date.now() - (daysAgo * 24 * 60 * 60 * 1000)) / 1000;
    
    const timeSession1 = baseTimestamp;
    const timeSession2 = baseTimestamp + (Math.floor(Math.random() * 10) + 1) * 3600;
    const timeSession3 = timeSession2 + (Math.floor(Math.random() * 48) + 12) * 3600;

    await trackEvent("login", customer.id, tenantId, { simulated: true, browser: ["Chrome", "Safari", "Edge"][Math.floor(Math.random() * 3)] }, timeSession1);
    await trackEvent("dashboard_view", customer.id, tenantId, { simulated: true }, timeSession1 + 10);

    if (Math.random() < 0.6) {
       await trackEvent("feature_view", customer.id, tenantId, { feature: ["ai_insights", "crypto_trading", "wealth_management_pro", "bulk_payroll_processing"][Math.floor(Math.random() * 4)], simulated: true }, timeSession1 + 45);
    }

    const applyLoan = Math.random() < 0.7;
    if (applyLoan) {
      const loanType = loanTypes[Math.floor(Math.random() * loanTypes.length)];
      const amount = Math.floor(Math.random() * 500000) + 50000;
      const term = [12, 24, 36, 60][Math.floor(Math.random() * 4)];
      await trackEvent("loan_page_view", customer.id, tenantId, { simulated: true }, timeSession2);
      
      const completesKYC = Math.random() < 0.5;
      const kycData = completesKYC ? { pan: pan.substring(0, 10), aadhaar: "123456789012", income: "500000", employment: "Salaried" } : {};
      const appStatus = completesKYC ? "PENDING" : "KYC_PENDING";

      await prisma.loanApplication.create({
        data: { customerId: customer.id, loanType, principalAmount: amount, term, interestRate: 8.5, status: appStatus, kycData, kycStep: completesKYC ? 3 : 1 },
      });

      await trackEvent("loan_applied", customer.id, tenantId, { loanType, amount, term, simulated: true }, timeSession2 + 300);

      if (completesKYC) {
        await trackEvent("kyc_started", customer.id, tenantId, { simulated: true }, timeSession2 + 320);
        await trackEvent("kyc_completed", customer.id, tenantId, { simulated: true }, timeSession2 + 600);
      } else {
        await trackEvent("kyc_started", customer.id, tenantId, { simulated: true }, timeSession2 + 320);
        await trackEvent("kyc_abandoned", customer.id, tenantId, { simulated: true, step_dropped: 1 }, timeSession2 + 500);
      }
    }
    
    if (Math.random() < 0.4) {
       await trackEvent("login", customer.id, tenantId, { simulated: true }, timeSession3);
       const feature = ["ai_insights", "crypto_trading", "wealth_management_pro", "bulk_payroll_processing"][Math.floor(Math.random() * 4)];
       await trackEvent(feature, customer.id, tenantId, { simulated: true, action: "pro_usage" }, timeSession3 + 120);
    }
  }
  console.log("Done");
}

run().catch(console.error);

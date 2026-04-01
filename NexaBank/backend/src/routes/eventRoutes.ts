import express, { Request, Response } from "express";
import { prisma } from "../prisma";
import { isLoggedIn, isAdmin } from "../middleware/IsLoggedIn";
import { trackEvent } from "../middleware/eventTracker";
import { UAParser } from "ua-parser-js";

const router = express.Router();

// ─── POST /events/track ────────────────────────────────────────
// Generic custom event tracker for frontend
router.post(
  "/events/track",
  isLoggedIn,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventType, metadata } = req.body;
      const customerId = (req as any).user?.id;
      const tenantId = (req as any).user?.tenantId || "bank_a";
      
      if (!customerId || !eventType) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      await trackEvent(eventType, customerId, tenantId, metadata);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("Frontend event tracking error:", err);
      res.status(500).json({ error: "Failed to track event" });
    }
  }
);

// ─── POST /events/location ─────────────────────────────────────
// Store geo-location + device metadata for a logged-in user
router.post(
  "/events/location",
  isLoggedIn,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        latitude,
        longitude,
        country,
        city,
        ip,
      } = req.body as {
        latitude?: number;
        longitude?: number;
        country?: string;
        city?: string;
        ip?: string;
      };

      const userContext = (req as any).user;
      const customerId = userContext?.id;
      const tenantId = userContext?.tenantId ?? "bank_a";

      if (!customerId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      // Parse device info from user-agent
      const rawUA = req.headers["user-agent"] ?? "";
      const parser = new UAParser(rawUA);
      const result = parser.getResult();

      let deviceType = "desktop";
      if (result.device.type === "mobile") deviceType = "mobile";
      else if (result.device.type === "tablet") deviceType = "tablet";

      const platform = `${result.os.name ?? "Unknown"} / ${result.browser.name ?? "Unknown"}`;

      await prisma.userLocation.create({
        data: {
          customerId,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          country: country ?? null,
          city: city ?? null,
          ip: ip ?? req.ip ?? null,
          deviceType,
          userAgent: rawUA.substring(0, 500),
          platform,
        },
      });

      await trackEvent("location_captured", customerId, tenantId, {
        country, city, deviceType, platform,
      });

      res.status(200).json({ message: "Location stored successfully" });
    } catch (err) {
      console.error("Location capture error:", err);
      res.status(500).json({ error: "Failed to store location" });
    }
  }
);

// ─── GET /events/toggles/:tenantId ────────────────────────────
// Get feature toggles for a tenant
router.get(
  "/events/toggles/:tenantId",
  async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = req.params;
    try {
      const toggles = await prisma.featureToggle.findMany({
        where: { tenantId },
      });

      // Return as map: { emi_calculator: true, kyc: true, loan_module: true }
      const map: Record<string, boolean> = {};
      for (const t of toggles) {
        map[t.key] = t.enabled;
      }

      res.status(200).json(map);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch toggles" });
    }
  }
);

// ─── PUT /events/toggles/:key ──────────────────────────────────
// Update a feature toggle (admin only)
router.put(
  "/events/toggles/:key",
  isLoggedIn,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;
    const { enabled, tenantId } = req.body as { enabled: boolean; tenantId: string };

    try {
      const toggle = await prisma.featureToggle.upsert({
        where: { key_tenantId: { key, tenantId } },
        update: { enabled },
        create: { key, enabled, tenantId },
      });

      res.status(200).json(toggle);
    } catch (err) {
      res.status(500).json({ error: "Failed to update toggle" });
    }
  }
);

// ─── GET /events/admin/stats ───────────────────────────────────
// Admin: get analytics overview
router.get(
  "/events/admin/stats",
  isLoggedIn,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const [
        totalUsers,
        totalEvents,
        totalTransactions,
        totalLoanApps,
        recentEvents,
      ] = await Promise.all([
        prisma.customer.count(),
        prisma.event.count(),
        prisma.transaction.count(),
        prisma.loanApplication.count(),
        prisma.event.findMany({
          orderBy: { timestamp: "desc" },
          take: 20,
        }),
      ]);

      res.status(200).json({
        totalUsers,
        totalEvents,
        totalTransactions,
        totalLoanApps,
        recentEvents,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  }
);

// ─── GET /events/admin/locations ──────────────────────────────
// Admin: get all user locations with device metadata
router.get(
  "/events/admin/locations",
  isLoggedIn,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const locations = await prisma.userLocation.findMany({
        orderBy: { timestamp: "desc" },
        take: 100,
        include: {
          customer: {
            select: { name: true, email: true, tenantId: true },
          },
        },
      });
      res.status(200).json(locations);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// ─── STOCHASTIC SIMULATION ENGINE ─────────────────────────────
// ═══════════════════════════════════════════════════════════════

// Helper: Gaussian-like random using Box-Muller
function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const normal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(0, mean + stdDev * normal);
}

// Helper: Pick random item
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: Weighted random pick
function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Data pools
const FIRST_NAMES = ["Aarav", "Priya", "Rahul", "Neha", "Amit", "Sneha", "Vikas", "Pooja", "Rajan", "Divya", "Karan", "Anita", "Suresh", "Meera", "Arjun", "Kavya", "Rohit", "Simran", "Deepak", "Nisha", "Vivek", "Sanya", "Harsh", "Ritika", "Manish", "Tanvi", "Akash", "Komal", "Nikhil", "Aditi"];
const LAST_NAMES = ["Sharma", "Patel", "Kumar", "Singh", "Verma", "Gupta", "Joshi", "Mehta", "Shah", "Agarwal", "Rao", "Nair", "Iyer", "Pillai", "Reddy", "Deshmukh", "Yadav", "Chauhan", "Saxena", "Malhotra"];
const INDIAN_CITIES = [
  { city: "Mumbai", state: "Maharashtra", lat: 19.076, lon: 72.877 },
  { city: "Delhi", state: "Delhi", lat: 28.613, lon: 77.209 },
  { city: "Bangalore", state: "Karnataka", lat: 12.971, lon: 77.594 },
  { city: "Hyderabad", state: "Telangana", lat: 17.385, lon: 78.486 },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.082, lon: 80.270 },
  { city: "Kolkata", state: "West Bengal", lat: 22.572, lon: 88.363 },
  { city: "Pune", state: "Maharashtra", lat: 18.520, lon: 73.856 },
  { city: "Jaipur", state: "Rajasthan", lat: 26.912, lon: 75.787 },
  { city: "Ahmedabad", state: "Gujarat", lat: 23.022, lon: 72.571 },
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.846, lon: 80.946 },
  { city: "Bhopal", state: "Madhya Pradesh", lat: 23.259, lon: 77.412 },
  { city: "Chandigarh", state: "Punjab", lat: 30.733, lon: 76.779 },
];
const SPEND_CATEGORIES = ["FOOD", "SHOPPING", "ENTERTAINMENT", "HOUSING", "OTHERS", "TRANSPORT", "UTILITIES", "HEALTHCARE"];
const CHANNELS: ("WEB" | "MOBILE" | "ATM" | "POS")[] = ["WEB", "MOBILE", "ATM", "POS"];
const CHANNEL_WEIGHTS = [35, 40, 10, 15]; // Mobile-first era
const LOAN_TYPES = ["HOME", "AUTO", "PERSONAL", "STUDENT"] as ("HOME" | "AUTO" | "PERSONAL" | "STUDENT")[];
const PRO_FEATURES = ["crypto-trading", "wealth-management-pro", "bulk-payroll-processing", "ai-insights"];
const DEVICE_TYPES = ["desktop", "mobile", "tablet"];
const PLATFORMS = ["Android / Chrome", "iOS / Safari", "Windows / Chrome", "macOS / Safari", "Windows / Edge", "Linux / Firefox"];

interface UserPersona {
  loginProbability: number;     // 0.15–0.95 (daily chance of logging in)
  spendingRate: number;         // 0.1–0.8 (chance of spending per login)
  averageSpend: number;         // mean spend amount
  proConversionChance: number;  // 0.02–0.4 (base, multiplied by whale factor)
  kycCompletionRate: number;    // 0.3–0.9 (chance of completing KYC)
  failureRate: number;          // 0.02–0.06 (chance of transaction failure)
  loanInterest: number;         // 0.1–0.6 (chance of applying for loan)
  salaryRange: [number, number]; // [min, max]
  preferredChannel: "WEB" | "MOBILE" | "ATM" | "POS";
}

function generatePersona(): UserPersona {
  const isWhale = Math.random() < 0.15; // 15% are high-value customers
  const isCasual = Math.random() < 0.3; // 30% are casual users

  return {
    loginProbability: isCasual ? 0.15 + Math.random() * 0.25 : 0.5 + Math.random() * 0.45,
    spendingRate: isCasual ? 0.1 + Math.random() * 0.2 : 0.3 + Math.random() * 0.5,
    averageSpend: isWhale ? 5000 + Math.random() * 20000 : 500 + Math.random() * 3000,
    proConversionChance: isWhale ? 0.15 + Math.random() * 0.25 : 0.02 + Math.random() * 0.08,
    kycCompletionRate: 0.3 + Math.random() * 0.6,
    failureRate: 0.02 + Math.random() * 0.04,
    loanInterest: isCasual ? 0.05 + Math.random() * 0.1 : 0.15 + Math.random() * 0.45,
    salaryRange: isWhale ? [80000, 200000] : [25000, 70000],
    preferredChannel: weightedPick(CHANNELS, CHANNEL_WEIGHTS),
  };
}

// ─── POST /events/simulate ────────────────────────────────────
// Admin only: stochastic user journey simulation
router.post(
  "/events/simulate",
  isLoggedIn,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { count = 50, tenantId = "bank_a", days = 30 } = req.body as {
      count?: number;
      tenantId?: string;
      days?: number;
    };

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      res.status(400).json({ error: "Invalid tenant" });
      return;
    }

    try {
      const bcrypt = await import("bcryptjs");
      let usersCreated = 0;
      let transactionsCreated = 0;
      let eventsCreated = 0;
      const createdUserIds: string[] = [];

      const simDays = Math.min(days, 60);
      const userCount = Math.min(count, 100);

      for (let i = 0; i < userCount; i++) {
        // ─── 1. Generate User Identity ──────────────────────
        const firstName = pick(FIRST_NAMES);
        const lastName = pick(LAST_NAMES);
        const name = `${firstName} ${lastName}`;
        const seed = Date.now() + i + Math.floor(Math.random() * 10000);
        const email = `${firstName.toLowerCase()}.${seed}@nexabank.demo`;
        const phone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
        const pan = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(1000 + Math.random() * 9000)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
        const hashedPw = await bcrypt.hash("Password@123", 10);
        const location = pick(INDIAN_CITIES);

        // ─── 2. Generate Persona (behavioral traits) ────────
        const persona = generatePersona();

        // ─── 3. Compute join date ───────────────────────────
        const joinDaysAgo = Math.floor(Math.random() * simDays);
        const joinDate = new Date();
        joinDate.setDate(joinDate.getDate() - joinDaysAgo);
        const baseTs = Math.floor(joinDate.getTime() / 1000);

        // ─── 4. Create customer ─────────────────────────────
        let customer;
        try {
          customer = await prisma.customer.create({
            data: {
              name, email, phone, password: hashedPw, pan, tenantId,
              dateOfBirth: new Date(1975 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)),
              settingConfig: {},
              address: { street: `${Math.floor(1 + Math.random() * 500)}, ${pick(["MG Road", "Park Street", "DJ Halli", "Anna Nagar", "Salt Lake", "Banjara Hills"])}`, city: location.city, state: location.state, zip: `${400000 + Math.floor(Math.random() * 200000)}` },
              kycStatus: "NOT_STARTED",
            },
          });
        } catch (e) {
          // Duplicate phone/email/pan — skip
          continue;
        }
        usersCreated++;
        createdUserIds.push(customer.id);

        // ─── 5. Create savings account ──────────────────────
        const accNo = `NEXA${String(seed).slice(-8)}`;
        let account;
        try {
          account = await prisma.account.create({
            data: {
              accNo, customerId: customer.id,
              ifsc: `${tenant.ifscPrefix}${tenant.branchCode}`,
              accountType: "SAVINGS",
              balance: 0,
            },
          });
        } catch (e) {
          continue;
        }

        // Track registration
        await trackEvent("register", customer.id, tenantId, { channel: persona.preferredChannel, city: location.city }, baseTs);
        await trackEvent("login", customer.id, tenantId, { channel: persona.preferredChannel, device: pick(DEVICE_TYPES) }, baseTs + 60);
        eventsCreated += 2;

        // ─── 6. Initial salary deposit ──────────────────────
        const salary = Math.floor(persona.salaryRange[0] + Math.random() * (persona.salaryRange[1] - persona.salaryRange[0]));
        await prisma.transaction.create({
          data: {
            transactionType: "DEPOSIT",
            senderAccNo: "EXTERNAL-BANK", receiverAccNo: accNo,
            amount: salary, status: "SUCCESS",
            category: "Salary Credit",
            channel: "WEB",
            timestamp: new Date((baseTs + 300) * 1000),
          }
        });
        transactionsCreated++;
        let currentBalance = salary;
        await prisma.account.update({ where: { accNo }, data: { balance: currentBalance } });

        // Store initial location
        await prisma.userLocation.create({
          data: {
            customerId: customer.id,
            latitude: location.lat + (Math.random() - 0.5) * 0.1,
            longitude: location.lon + (Math.random() - 0.5) * 0.1,
            country: "India",
            city: location.city,
            ip: `${100 + Math.floor(Math.random() * 50)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            deviceType: pick(DEVICE_TYPES),
            platform: pick(PLATFORMS),
          },
        });

        // ─── 7. State Machine: 30-Day Journey ──────────────
        let kycState: "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED" = "NOT_STARTED";
        let isPro = false;
        let hasAppliedLoan = false;
        let lastLoginDay = 0;

        for (let day = 0; day <= joinDaysAgo; day++) {
          const dayTs = baseTs + (day * 86400) + Math.floor(Math.random() * 43200); // random hour within the day

          // ── Salary deposit on 1st and 15th of month ───────
          const dayOfMonth = new Date(dayTs * 1000).getDate();
          if (dayOfMonth === 1 || dayOfMonth === 15) {
            const monthlySalary = Math.floor(gaussianRandom(salary, salary * 0.1));
            await prisma.transaction.create({
              data: {
                transactionType: "DEPOSIT",
                senderAccNo: "EXTERNAL-BANK", receiverAccNo: accNo,
                amount: monthlySalary, status: "SUCCESS",
                category: "Salary Credit", channel: "WEB",
                timestamp: new Date((dayTs + 100) * 1000),
              }
            });
            currentBalance += monthlySalary;
            await prisma.account.update({ where: { accNo }, data: { balance: currentBalance } });
            transactionsCreated++;
          }

          // ── Daily Login Roll ──────────────────────────────
          if (Math.random() > persona.loginProbability) continue;

          // User logged in today
          lastLoginDay = day;
          const channel = Math.random() < 0.6 ? persona.preferredChannel : pick(CHANNELS);
          await trackEvent("login", customer.id, tenantId, { channel, device: pick(DEVICE_TYPES), day }, dayTs);
          eventsCreated++;

          // Update lastLogin
          await prisma.customer.update({
            where: { id: customer.id },
            data: { lastLogin: new Date(dayTs * 1000) },
          });

          // ── KYC State Machine ─────────────────────────────
          if (kycState === "NOT_STARTED" && day > 2 && Math.random() < 0.25) {
            kycState = "PENDING";
            await prisma.customer.update({ where: { id: customer.id }, data: { kycStatus: "PENDING" } });
            await trackEvent("kyc_started", customer.id, tenantId, {}, dayTs + 200);
            eventsCreated++;
          }
          if (kycState === "PENDING" && Math.random() < persona.kycCompletionRate * 0.3) {
            if (Math.random() < 0.85) {
              kycState = "VERIFIED";
              await prisma.customer.update({
                where: { id: customer.id },
                data: { kycStatus: "VERIFIED", kycCompletedAt: new Date((dayTs + 500) * 1000) }
              });
              await trackEvent("kyc_completed", customer.id, tenantId, {}, dayTs + 500);
            } else {
              kycState = "REJECTED";
              await prisma.customer.update({ where: { id: customer.id }, data: { kycStatus: "REJECTED" } });
              await trackEvent("kyc_failed", customer.id, tenantId, { reason: pick(["Document Mismatch", "Expired ID", "Blurry Photo", "Name Mismatch"]) }, dayTs + 500);
            }
            eventsCreated++;
          }

          // ── Spending Events ───────────────────────────────
          if (Math.random() < persona.spendingRate && currentBalance > 1000) {
            const spendAmount = Math.floor(gaussianRandom(persona.averageSpend, persona.averageSpend * 0.4));
            const clampedAmount = Math.min(spendAmount, currentBalance * 0.3); // Don't spend more than 30% of balance
            if (clampedAmount >= 100) {
              const category = pick(SPEND_CATEGORIES);
              const txChannel = weightedPick(CHANNELS, CHANNEL_WEIGHTS);
              const success = Math.random() > persona.failureRate;

              await prisma.transaction.create({
                data: {
                  transactionType: "PAYMENT",
                  senderAccNo: accNo, receiverAccNo: "MERCHANT-ID",
                  amount: clampedAmount,
                  status: success ? "SUCCESS" : "FAILED",
                  category, channel: txChannel,
                  description: success ? `${category} purchase` : `Failed: ${pick(["Network Error", "Card Declined", "Timeout", "Server Error"])}`,
                  timestamp: new Date((dayTs + 1200 + Math.floor(Math.random() * 3600)) * 1000),
                }
              });
              transactionsCreated++;

              if (success) {
                currentBalance -= clampedAmount;
                await prisma.account.update({ where: { accNo }, data: { balance: currentBalance } });
                await trackEvent("payment_completed", customer.id, tenantId, { amount: clampedAmount, category, channel: txChannel }, dayTs + 1205);
              } else {
                await trackEvent("payment_failed", customer.id, tenantId, { amount: clampedAmount, reason: "Transaction Error" }, dayTs + 1205);
              }
              eventsCreated++;
            }

            // ── Second transaction (some users do multiple per day)
            if (Math.random() < 0.3 && currentBalance > 2000) {
              const amount2 = Math.floor(gaussianRandom(persona.averageSpend * 0.5, persona.averageSpend * 0.3));
              const clamped2 = Math.min(amount2, currentBalance * 0.15);
              if (clamped2 >= 100) {
                const cat2 = pick(SPEND_CATEGORIES);
                await prisma.transaction.create({
                  data: {
                    transactionType: "PAYMENT",
                    senderAccNo: accNo, receiverAccNo: "MERCHANT-ID",
                    amount: clamped2, status: "SUCCESS", category: cat2,
                    channel: pick(CHANNELS),
                    timestamp: new Date((dayTs + 5000 + Math.floor(Math.random() * 7200)) * 1000),
                  }
                });
                currentBalance -= clamped2;
                await prisma.account.update({ where: { accNo }, data: { balance: currentBalance } });
                transactionsCreated++;
              }
            }
          }

          // ── ATM Withdrawal (round numbers) ────────────────
          if (Math.random() < 0.08 && currentBalance > 5000) {
            const atmAmounts = [500, 1000, 2000, 5000, 10000];
            const atmAmount = pick(atmAmounts.filter(a => a < currentBalance * 0.3));
            if (atmAmount) {
              await prisma.transaction.create({
                data: {
                  transactionType: "WITHDRAWAL",
                  senderAccNo: accNo, receiverAccNo: "EXTERNAL-BANK",
                  amount: atmAmount, status: "SUCCESS",
                  category: "ATM Withdrawal", channel: "ATM",
                  timestamp: new Date((dayTs + 8000) * 1000),
                }
              });
              currentBalance -= atmAmount;
              await prisma.account.update({ where: { accNo }, data: { balance: currentBalance } });
              transactionsCreated++;
            }
          }

          // ── Loan Application ──────────────────────────────
          if (!hasAppliedLoan && kycState === "VERIFIED" && day > 5 && Math.random() < persona.loanInterest * 0.15) {
            const loanType = pick(LOAN_TYPES);
            const loanAmounts: Record<string, [number, number]> = {
              HOME: [500000, 5000000],
              AUTO: [200000, 1500000],
              PERSONAL: [50000, 500000],
              STUDENT: [100000, 1000000],
            };
            const [minL, maxL] = loanAmounts[loanType as string];
            const principalAmount = Math.floor(minL + Math.random() * (maxL - minL));
            const term = pick([12, 24, 36, 48, 60]);
            const interestRate = 7 + Math.random() * 7;

            const kycComplete = Math.random() < persona.kycCompletionRate;
            await prisma.loanApplication.create({
              data: {
                customerId: customer.id,
                loanType,
                principalAmount,
                term,
                interestRate: parseFloat(interestRate.toFixed(2)),
                status: kycComplete ? "PENDING" : "KYC_PENDING",
                kycData: kycComplete ? { pan: customer.pan, aadhaar: `${Math.floor(100000000000 + Math.random() * 900000000000)}`, income: salary.toString(), employment: pick(["Salaried", "Self-Employed", "Business", "Freelancer"]) } : {},
                kycStep: kycComplete ? 3 : Math.floor(Math.random() * 2) + 1,
              },
            });
            hasAppliedLoan = true;

            await trackEvent("loan_applied", customer.id, tenantId, { loanType, amount: principalAmount, term }, dayTs + 3000);
            if (kycComplete) {
              await trackEvent("kyc_completed", customer.id, tenantId, { context: "loan" }, dayTs + 3500);
            } else {
              await trackEvent("kyc_abandoned", customer.id, tenantId, { step: 1, context: "loan" }, dayTs + 3500);
            }
            eventsCreated += 2;
          }

          // ── Pro Feature Exploration & Conversion ──────────
          if (!isPro && Math.random() < 0.12) {
            const featureId = pick(PRO_FEATURES);
            await trackEvent("feature_view", customer.id, tenantId, { featureId }, dayTs + 4000);
            eventsCreated++;

            // Whale users (high balance) are 5x more likely to convert
            const isWhale = currentBalance > 100000;
            const conversionChance = persona.proConversionChance * (isWhale ? 5 : 1);

            if (currentBalance > 5000 && Math.random() < conversionChance) {
              const expiry = new Date((dayTs + 86400 * 30) * 1000);
              try {
                await prisma.userLicense.create({
                  data: { customerId: customer.id, featureId, amount: 2000, expiryDate: expiry }
                });
                await prisma.transaction.create({
                  data: {
                    transactionType: "PRO_LICENSE_FEE",
                    senderAccNo: accNo, receiverAccNo: "NEXABANK-SYSTEM",
                    amount: 2000, status: "SUCCESS",
                    category: "Subscription", channel: "WEB",
                    timestamp: new Date((dayTs + 4500) * 1000),
                  }
                });
                currentBalance -= 2000;
                await prisma.account.update({ where: { accNo }, data: { balance: currentBalance } });
                await trackEvent("pro_unlocked", customer.id, tenantId, { featureId }, dayTs + 4505);
                isPro = true;
                transactionsCreated++;
                eventsCreated++;
              } catch (e) {
                // License already exists — skip
              }
            }
          }

          // ── Pro Feature Usage (already pro users) ─────────
          if (isPro && Math.random() < 0.5) {
            await trackEvent("pro_feature_usage", customer.id, tenantId, { day, action: pick(["dashboard_view", "trade_view", "report_view"]) }, dayTs + 6000);
            eventsCreated++;
          }

          // ── Dashboard & page views ────────────────────────
          if (Math.random() < 0.7) {
            await trackEvent("dashboard_view", customer.id, tenantId, { channel }, dayTs + 200);
            eventsCreated++;
          }
          if (Math.random() < 0.3) {
            await trackEvent("transactions_view", customer.id, tenantId, {}, dayTs + 800);
            eventsCreated++;
          }
        }

        // Update final balance
        await prisma.account.update({ where: { accNo }, data: { balance: currentBalance } });
      }

      // ─── 8. Generate Payee Relationships ────────────────
      // Link some simulated users as payees of each other
      let payeesCreated = 0;
      if (createdUserIds.length >= 3) {
        const shuffled = [...createdUserIds].sort(() => Math.random() - 0.5);
        const pairCount = Math.min(Math.floor(createdUserIds.length * 0.4), 30);

        for (let p = 0; p < pairCount && p + 1 < shuffled.length; p++) {
          try {
            const payerCustomer = await prisma.customer.findUnique({ where: { id: shuffled[p] } });
            const payeeCustomer = await prisma.customer.findUnique({ where: { id: shuffled[p + 1] } });
            if (!payerCustomer || !payeeCustomer) continue;

            const payerAccount = await prisma.account.findFirst({ where: { customerId: payerCustomer.id } });
            const payeeAccount = await prisma.account.findFirst({ where: { customerId: payeeCustomer.id } });
            if (!payerAccount || !payeeAccount) continue;

            const existing = await prisma.payee.findFirst({
              where: { payerCustomerId: payerCustomer.id, payeeCustomerId: payeeCustomer.id }
            });
            if (existing) continue;

            await prisma.payee.create({
              data: {
                name: payeeCustomer.name,
                payeeAccNo: payeeAccount.accNo,
                payeeifsc: payeeAccount.ifsc,
                payeeCustomerId: payeeCustomer.id,
                payerCustomerId: payerCustomer.id,
                payeeType: "INDIVIDUAL",
              }
            });
            payeesCreated++;

            // Some payees also do a transfer
            if (Math.random() < 0.4 && payerAccount.balance > 5000) {
              const transferAmount = Math.floor(1000 + Math.random() * 5000);
              await prisma.transaction.create({
                data: {
                  transactionType: "TRANSFER",
                  senderAccNo: payerAccount.accNo,
                  receiverAccNo: payeeAccount.accNo,
                  amount: transferAmount,
                  status: "SUCCESS",
                  category: "PAYEE_TRANSFER",
                  channel: "WEB",
                  description: `Transfer to ${payeeCustomer.name}`,
                }
              });
              await prisma.account.update({ where: { accNo: payerAccount.accNo }, data: { balance: { decrement: transferAmount } } });
              await prisma.account.update({ where: { accNo: payeeAccount.accNo }, data: { balance: { increment: transferAmount } } });
              transactionsCreated++;
            }
          } catch (e) {
            // Skip on error
          }
        }
      }

      res.status(200).json({
        message: "Stochastic simulation complete",
        usersCreated,
        transactionsCreated,
        eventsCreated,
        payeesCreated,
        simulatedDays: simDays,
      });
    } catch (err) {
      console.error("Simulation error:", err);
      res.status(500).json({ error: "Simulation failed", details: err instanceof Error ? err.message : "Unknown" });
    }
  }
);

export default router;

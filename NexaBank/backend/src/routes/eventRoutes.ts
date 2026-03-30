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

// ─── POST /events/simulate ────────────────────────────────────
// Admin only: simulate users for analytics data generation
router.post(
  "/events/simulate",
  isLoggedIn,
  isAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { count = 20, tenantId = "bank_a" } = req.body as {
      count?: number;
      tenantId?: string;
    };

    // Validate tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      res.status(400).json({ error: "Invalid tenant" });
      return;
    }

    try {
      const bcrypt = await import("bcryptjs");
      let usersCreated = 0;
      let loansApplied = 0;
      let kycCompleted = 0;
      let fullyCompleted = 0;

      const firstNames = ["Aarav", "Priya", "Rahul", "Neha", "Amit", "Sneha", "Vikas", "Pooja", "Rajan", "Divya", "Karan", "Anita", "Suresh", "Meera", "Arjun", "Kavya", "Rohit", "Simran", "Deepak", "Nisha"];
      const lastNames = ["Sharma", "Patel", "Kumar", "Singh", "Verma", "Gupta", "Joshi", "Mehta", "Shah", "Agarwal", "Rao", "Nair", "Iyer", "Pillai", "Reddy"];
      const loanTypes = ["HOME", "AUTO", "PERSONAL", "STUDENT"] as const;

      for (let i = 0; i < Math.min(count, 100); i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const name = `${firstName} ${lastName}`;
        const ts = Date.now() + i;
        const email = `sim${ts}@nexabank.demo`;
        const phone = `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`;
        const pan = `SIM${String(i).padStart(2, "0")}${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(Math.random() * 9)}`;
        const hashedPw = await bcrypt.hash("SimUser@123", 10);

        const randomDob = new Date(
          1970 + Math.floor(Math.random() * 30),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        );

        let customer;
        try {
          customer = await prisma.customer.create({
            data: {
              name,
              email,
              phone,
              password: hashedPw,
              pan: pan.substring(0, 10).toUpperCase(),
              tenantId,
              dateOfBirth: randomDob,
              settingConfig: {},
              address: { street: "Simulated Street", city: "Mumbai", state: "Maharashtra", zip: "400001" },
            },
          });
          usersCreated++;
        } catch {
          continue; // skip duplicates
        }

        // Create a SAVINGS account
        const accNo = `SIM${String(ts).slice(-8)}`;
        const ifsc = `${tenant.ifscPrefix}${tenant.branchCode}`;

        await prisma.account.create({
          data: {
            accNo,
            customerId: customer.id,
            ifsc,
            accountType: "SAVINGS",
            balance: Math.floor(Math.random() * 500000) + 10000,
          },
        });

        await trackEvent("login", customer.id, tenantId, { simulated: true });

        // 70% chance of applying for a loan
        const applyLoan = Math.random() < 0.7;
        if (applyLoan) {
          const loanType = loanTypes[Math.floor(Math.random() * loanTypes.length)];
          const amount = Math.floor(Math.random() * 500000) + 50000;
          const term = [12, 24, 36, 60][Math.floor(Math.random() * 4)];
          const rates: Record<string, number> = { HOME: 8.5, AUTO: 9.2, PERSONAL: 10.5, STUDENT: 8.0 };
          
          // 50% drop at KYC — leave kycStep = 0
          const completesKYC = Math.random() < 0.5;
          const kycData = completesKYC
            ? { pan: pan.substring(0, 10), aadhaar: String(Math.floor(Math.random() * 900000000000) + 100000000000), income: String(Math.floor(Math.random() * 1000000) + 300000), employment: "Salaried" }
            : {};

          const appStatus = completesKYC ? "PENDING" : "KYC_PENDING";

          await prisma.loanApplication.create({
            data: {
              customerId: customer.id,
              loanType,
              principalAmount: amount,
              term,
              interestRate: rates[loanType],
              status: appStatus,
              kycData,
              kycStep: completesKYC ? 3 : Math.floor(Math.random() * 2),
            },
          });

          loansApplied++;
          await trackEvent("loan_applied", customer.id, tenantId, { loanType, amount, term, simulated: true });

          if (completesKYC) {
            kycCompleted++;
            await trackEvent("kyc_completed", customer.id, tenantId, { simulated: true });
            fullyCompleted++;
          } else {
            await trackEvent("kyc_started", customer.id, tenantId, { simulated: true });
          }
        }
      }

      res.status(200).json({
        message: "Simulation complete",
        usersCreated,
        loansApplied,
        kycCompleted,
        fullyCompleted,
      });
    } catch (err) {
      console.error("Simulation error:", err);
      res.status(500).json({ error: "Simulation failed" });
    }
  }
);

export default router;

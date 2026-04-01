import { Request, Response } from "express";
import { prisma } from "../prisma";
import { trackEvent } from "../middleware/eventTracker";

// ─── POST /pro/unlock ──────────────────────────────────────────
// Deducts ₹2,000 and issues a 1-month license
export const unlockFeature = async (req: Request, res: Response): Promise<void> => {
  const { featureId } = req.body;
  const customerId = (req as any).user?.id;
  const tenantId = (req as any).user?.tenantId || "bank_a";

  if (!featureId || !customerId) {
    res.status(400).json({ error: "Missing featureId or customerId" });
    return;
  }

  try {
    // 1. Find user's primary/any account with balance >= 2000
    const accounts = await prisma.account.findMany({
      where: { customerId, accountType: { in: ["SAVINGS", "CURRENT", "INVESTMENT"] } },
      orderBy: { balance: "desc" },
    });

    if (accounts.length === 0 || accounts[0].balance < 2000) {
      res.status(400).json({ error: "Insufficient funds. ₹2,000 required." });
      return;
    }

    const primaryAccount = accounts[0];

    // 2. Perform atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct fee
      await tx.account.update({
        where: { accNo: primaryAccount.accNo },
        data: { balance: { decrement: 2000 } },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          transactionType: "PRO_LICENSE_FEE",
          senderAccNo: primaryAccount.accNo,
          receiverAccNo: "NEXABANK-SYSTEM",
          amount: 2000,
          status: "SUCCESS",
          category: "Service Fee",
          description: `Unlock ${featureId} license`,
          channel: "WEB"
        },
      });

      // Issue/Update License (1 month duration)
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const license = await tx.userLicense.upsert({
        where: { customerId_featureId: { customerId, featureId } },
        update: { expiryDate, active: true, amount: 2000 },
        create: { customerId, featureId, amount: 2000, expiryDate },
      });

      return license;
    });

    await trackEvent("pro_license_unlocked", customerId, tenantId, { featureId, amount: 2000 });

    res.status(200).json({
      message: "Feature unlocked successfully for 1 month",
      license: result,
    });
  } catch (err) {
    console.error("Unlock error:", err);
    res.status(500).json({ error: "Failed to unlock feature" });
  }
};

// ─── GET /pro/status ───────────────────────────────────────────
// Returns unlocked features for the user
export const getProStatus = async (req: Request, res: Response): Promise<void> => {
  const customerId = (req as any).user?.id;
  if (!customerId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const licenses = await prisma.userLicense.findMany({
      where: { customerId, active: true, expiryDate: { gt: new Date() } },
    });
    res.status(200).json(licenses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch licenses" });
  }
};

// ─── POST /pro/trade ───────────────────────────────────────────
// Simulates buying/selling crypto and updates investment JSON
export const executeTrade = async (req: Request, res: Response): Promise<void> => {
  const { asset, amount, price, type } = req.body; // type: 'BUY' | 'SELL'
  const customerId = (req as any).user?.id;
  const tenantId = (req as any).user?.tenantId || "bank_a";

  if (!asset || !amount || !price || !customerId) {
    res.status(400).json({ error: "Missing trade details" });
    return;
  }

  try {
    const account = await prisma.account.findFirst({
      where: { customerId, accountType: { in: ["SAVINGS", "CURRENT", "INVESTMENT"] } },
      orderBy: { balance: "desc" }
    });

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const totalCost = amount * price;
    if (type === "BUY" && account.balance < totalCost) {
      res.status(400).json({ error: "Insufficient funds for trade" });
      return;
    }

    // Update investment JSON and balance
    const currentInvestments = (account.investment as any) || [];
    let updatedInvestments = [...currentInvestments];

    const assetIndex = updatedInvestments.findIndex((i: any) => i.asset === asset);

    if (type === "BUY") {
      if (assetIndex > -1) {
        updatedInvestments[assetIndex].amount += amount;
        updatedInvestments[assetIndex].avgPrice = 
          (updatedInvestments[assetIndex].avgPrice + price) / 2;
      } else {
        updatedInvestments.push({ type: "CRYPTO", asset, amount, avgPrice: price });
      }
    } else {
      if (assetIndex === -1 || updatedInvestments[assetIndex].amount < amount) {
        res.status(400).json({ error: "Insufficient asset holdings" });
        return;
      }
      updatedInvestments[assetIndex].amount -= amount;
      if (updatedInvestments[assetIndex].amount === 0) {
        updatedInvestments.splice(assetIndex, 1);
      }
    }

    await prisma.$transaction([
      prisma.account.update({
        where: { accNo: account.accNo },
        data: { 
          balance: type === "BUY" ? { decrement: totalCost } : { increment: totalCost },
          investment: updatedInvestments
        },
      }),
      prisma.transaction.create({
        data: {
          transactionType: "PAYMENT",
          senderAccNo: type === "BUY" ? account.accNo : "CRYPTO-EXCHANGE",
          receiverAccNo: type === "BUY" ? "CRYPTO-EXCHANGE" : account.accNo,
          amount: totalCost,
          status: "SUCCESS",
          category: "Crypto Trade",
          description: `${type} ${amount} ${asset}`,
          channel: "MOBILE"
        },
      }),
    ]);

    await trackEvent("crypto_trade_execution", customerId, tenantId, { asset, amount, type });

    res.status(200).json({ success: true, investments: updatedInvestments });
  } catch (err) {
    console.error("Trade error:", err);
    res.status(500).json({ error: "Trade failed" });
  }
};

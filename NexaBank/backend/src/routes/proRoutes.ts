import express from "express";
import * as proController from "../controllers/proController";

const router = express.Router();

// All pro routes are already behind isLoggedIn via app.use("/api/pro", isLoggedIn, proRoutes)
// Do NOT add isLoggedIn here again — it causes double auth checks
router.post("/unlock", proController.unlockFeature as any);
router.get("/status", proController.getProStatus as any);
router.post("/trade", proController.executeTrade as any);

export default router;

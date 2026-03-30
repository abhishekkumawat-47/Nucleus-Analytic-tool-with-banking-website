import dotenv from "dotenv";
import http from "http";
import app from "./app";
import { prisma } from "./prisma";

dotenv.config({ path: [".env.local", ".env"] });

const PORT: number = parseInt(process.env.PORT || "5000", 10);

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV ?? "development"}`);
});

server.on("error", (error: Error) => {
  console.error("Server error:", error);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (): Promise<void> => {
  console.log("\n🔄 Shutting down gracefully...");
  server.close(() => {
    console.log("✅ HTTP server closed");
  });
  await prisma.$disconnect();
  console.log("✅ Database disconnected");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

// ─── Route imports (TODO: uncomment as implemented) ───────────────
// import authRoutes from "./routes/auth.routes";
// import fdrRoutes from "./routes/fdr.routes";
// import securityDepositRoutes from "./routes/securityDeposit.routes";
// import dashboardRoutes from "./routes/dashboard.routes";
// import notificationRoutes from "./routes/notification.routes";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Garuda Netra API is running",
    timestamp: new Date().toISOString(),
    version: "0.0.1",
  });
});

// ─── Routes ───────────────────────────────────────────────────────
// app.use("/api/auth", authRoutes);
// app.use("/api/fdrs", fdrRoutes);
// app.use("/api/security-deposits", securityDepositRoutes);
// app.use("/api/dashboard", dashboardRoutes);
// app.use("/api/notifications", notificationRoutes);

// ─── 404 handler ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// ─── Start server ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Garuda Netra API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});

export default app;

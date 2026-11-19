const express = require("express");
const cors = require("cors");
const path = require("path");
const {
  runBackgroundRecovery,
} = require("./services/recoveryService");

require("dotenv").config({
  path: "./.env",
});

const recoveryRoutes = require("./routes/recoveryRoutes");
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const monitoringRoutes = require("./routes/monitoringRoutes");

require("./config/db");
const { collectAllMetrics } = require("./services/monitoringService");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/recovery", recoveryRoutes);

const frontendPath = path.join(__dirname, "../frontend");

app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.send("CloudVault AI Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.post("/test", (req, res) => {
  console.log("BODY RECEIVED:", req.body);

  res.json({
    success: true,
    body: req.body
  });
});


let monitoringInProgress = false;

async function runStorageMonitoring() {
  if (monitoringInProgress) {
    console.log("⏳ Previous monitoring cycle is still running. Skipping.");
    return;
  }

  monitoringInProgress = true;

  try {
    const results = await collectAllMetrics();
    const availableNodes = results.filter(
      (node) => node.isAvailable
    ).length;

    console.log(
      `📊 Storage monitoring: ${availableNodes}/${results.length} nodes available`
    );
  } catch (error) {
    console.error("❌ Storage monitoring error:", error.message);
  } finally {
    monitoringInProgress = false;
  }
}


let recoverySchedulerInProgress = false;

async function runRecoveryScheduler() {
  if (recoverySchedulerInProgress) {
    console.log("⏳ Previous recovery cycle still running. Skipping.");
    return;
  }

  recoverySchedulerInProgress = true;

  try {
    await runBackgroundRecovery();
  } catch (error) {
    console.error(
      "❌ Background recovery error:",
      error.message
    );
  } finally {
    recoverySchedulerInProgress = false;
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Storage monitoring: every 30 seconds
  runStorageMonitoring();
  setInterval(runStorageMonitoring, 30_000);

  // Background self-healing: every 60 seconds
 runRecoveryScheduler();
 setInterval(runRecoveryScheduler, 60_000);
});

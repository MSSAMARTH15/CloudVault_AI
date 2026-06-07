const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({
  path: "./.env",
});

const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");

require("./config/db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

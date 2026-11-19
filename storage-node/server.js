
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 7000;
const STORAGE_DIR = process.env.STORAGE_DIR || "/data";
const NODE_ID = process.env.NODE_ID || "storage-node";

app.use(express.json({ limit: "1mb" }));


fs.mkdirSync(STORAGE_DIR, { recursive: true });

function getSafePath(fileId) {
  if (
    typeof fileId !== "string" ||
    !/^[a-zA-Z0-9_-]+$/.test(fileId)
  ) {
    throw new Error("Invalid file ID");
  }

  return path.join(STORAGE_DIR, fileId);
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    nodeId: NODE_ID,
  });
});


/**
 * Storage metrics
 * Reports actual files and bytes stored on this node.
 */

// Storage metrics
app.get("/metrics", (req, res) => {
  try {
    const entries = fs.readdirSync(STORAGE_DIR, {
      withFileTypes: true,
    });

    let chunkCount = 0;
    let totalBytes = 0;

    for (const entry of entries) {
      if (!entry.isFile() || entry.name.endsWith(".tmp")) {
        continue;
      }

      const filePath = path.join(STORAGE_DIR, entry.name);
      const stats = fs.statSync(filePath);

      chunkCount += 1;
      totalBytes += stats.size;
    }

    res.json({
      nodeId: NODE_ID,
      status: "healthy",
      chunkCount,
      totalBytes,
      totalBytesMB: Number(
        (totalBytes / (1024 * 1024)).toFixed(4)
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Metrics collection failed:", error.message);

    res.status(500).json({
      nodeId: NODE_ID,
      status: "error",
      message: "Unable to collect storage metrics",
    });
  }
});

// Speed benchmark
app.get("/speed", (req, res) => {
  try {
    const SIZE_MB = 5;

    const buffer = Buffer.alloc(
      SIZE_MB * 1024 * 1024,
      "a"
    );

    res.setHeader(
      "Content-Type",
      "application/octet-stream"
    );

    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error("Speed benchmark failed:", error.message);

    res.status(500).json({
      message: "Unable to run speed benchmark",
    });
  }
});


// Store a chunk sent as a JSON base64 string.
app.put("/chunks/:chunkId", (req, res) => {
  try {
    const chunkPath = getSafePath(req.params.chunkId);
    const { data } = req.body;

    if (typeof data !== "string" || data.length === 0) {
      return res.status(400).json({
        message: "Chunk data is required",
      });
    }

    const buffer = Buffer.from(data, "base64");

    // Reject malformed base64 instead of silently accepting it.
    if (buffer.toString("base64") !== data) {
      return res.status(400).json({
        message: "Invalid base64 data",
      });
    }

    const tempPath = `${chunkPath}.${crypto.randomUUID()}.tmp`;

    try {
      fs.writeFileSync(tempPath, buffer, { flag: "wx" });
      fs.renameSync(tempPath, chunkPath);
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }

    res.status(201).json({
      message: "Chunk stored",
      nodeId: NODE_ID,
      chunkId: req.params.chunkId,
      size: buffer.length,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    });
  } catch (error) {
    console.error("Chunk storage failed:", error.message);
    res.status(500).json({ message: "Chunk storage failed" });
  }
});

// Retrieve a stored chunk.
app.get("/chunks/:chunkId", (req, res) => {
  try {
    const chunkPath = getSafePath(req.params.chunkId);

    if (!fs.existsSync(chunkPath)) {
      return res.status(404).json({
        message: "Chunk not found",
        nodeId: NODE_ID,
      });
    }

    const buffer = fs.readFileSync(chunkPath);

    res.json({
      nodeId: NODE_ID,
      chunkId: req.params.chunkId,
      data: buffer.toString("base64"),
      size: buffer.length,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    });
  } catch (error) {
    console.error("Chunk retrieval failed:", error.message);
    res.status(500).json({ message: "Chunk retrieval failed" });
  }
});

// Delete a stored chunk.
app.delete("/chunks/:chunkId", (req, res) => {
  try {
    const chunkPath = getSafePath(req.params.chunkId);

    if (!fs.existsSync(chunkPath)) {
      return res.status(404).json({ message: "Chunk not found" });
    }

    fs.unlinkSync(chunkPath);

    res.json({
      message: "Chunk deleted",
      nodeId: NODE_ID,
    });
  } catch (error) {
    console.error("Chunk deletion failed:", error.message);
    res.status(500).json({ message: "Chunk deletion failed" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`${NODE_ID} listening on port ${PORT}`);
});

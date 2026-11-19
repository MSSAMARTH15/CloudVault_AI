
const express = require("express");
const db = require("../config/db");
const {
  analyzeStorageNodes,
} = require("../services/anomalyDetectionService");
const router = express.Router();

// Get the latest monitoring record for each storage node
router.get("/metrics", (req, res) => {
  const query = `
    SELECT sm.node_id,
       sm.is_available,
       sm.latency_ms,
       sm.chunk_count,
       sm.total_bytes,
       sm.download_speed_mbps,
       sm.recorded_at
    FROM storage_metrics sm
    INNER JOIN (
      SELECT node_id, MAX(metric_id) AS latest_id
      FROM storage_metrics
      GROUP BY node_id
    ) latest ON sm.metric_id = latest.latest_id
    ORDER BY sm.node_id
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error("Failed to fetch storage metrics:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch storage metrics",
      });
    }

    res.json({
      success: true,
      nodes: results,
    });
  });
});


// Analyze historical storage metrics for anomalies
router.get("/anomalies", async (req, res) => {
  try {
    const result = await analyzeStorageNodes();
    res.json(result);
  } catch (error) {
    console.error("Anomaly analysis failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to analyze storage anomalies",
    });
  }
});

module.exports = router;

const db = require("../config/db");

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (error, rows) => {
      if (error) return reject(error);
      resolve(rows);
    });
  });
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values, average) {
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

async function analyzeStorageNodes() {
  const rows = await queryAsync(`
    SELECT node_id, is_available, latency_ms, recorded_at
    FROM storage_metrics
    ORDER BY node_id, recorded_at DESC
  `);

  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.node_id)) grouped.set(row.node_id, []);
    grouped.get(row.node_id).push(row);
  }

  const results = [];

  for (const [nodeId, history] of grouped.entries()) {
    const latest = history[0];

    // Use older successful measurements as the baseline.
    const baseline = history
      .slice(1, 31)
      .filter(
        (row) =>
          Number(row.is_available) === 1 &&
          row.latency_ms !== null &&
          Number.isFinite(Number(row.latency_ms))
      )
      .map((row) => Number(row.latency_ms));

    const recentFailures = history
      .slice(0, 5)
      .filter((row) => Number(row.is_available) !== 1).length;

    const anomalies = [];

    if (Number(latest.is_available) !== 1) {
      anomalies.push({
        type: "NODE_UNAVAILABLE",
        severity: "high",
        message: `${nodeId} is currently unavailable.`,
      });
    }

    if (recentFailures >= 3) {
      anomalies.push({
        type: "REPEATED_FAILURES",
        severity: "high",
        message: `${nodeId} has failed in ${recentFailures} of its last 5 recorded checks.`,
      });
    }

    if (baseline.length >= 5 && Number(latest.is_available) === 1) {
      const currentLatency = Number(latest.latency_ms);
      const average = mean(baseline);
      const deviation = standardDeviation(baseline, average);

      // Avoid flagging tiny changes when historical latency barely varies.
      const threshold = Math.max(average + 3 * deviation, average * 1.5);

      if (Number.isFinite(currentLatency) && currentLatency > threshold) {
        anomalies.push({
          type: "LATENCY_SPIKE",
          severity: "medium",
          message: `${nodeId} latency (${currentLatency.toFixed(1)} ms) is unusually high compared with its historical baseline (${average.toFixed(1)} ms).`,
        });
      }
    }

    results.push({
  nodeId,
  checkedAt: latest.recorded_at,
  latencyMs: latest.latency_ms,
  estimatedSpeed:
    latest.latency_ms !== null && Number(latest.latency_ms) > 0
      ? Number(latest.total_bytes || 0) /
        Number(latest.latency_ms) /
        1024
      : null,
  baselineSamples: baseline.length,
  anomalies,
  status:
    anomalies.some((item) => item.severity === "high")
      ? "critical"
      : anomalies.length > 0
        ? "warning"
        : baseline.length < 5
          ? "insufficient_history"
          : "normal",
});
  }

  return {
    success: true,
    analyzedNodes: results.length,
    totalAnomalies: results.reduce(
      (total, node) => total + node.anomalies.length,
      0
    ),
    nodes: results,
  };
}

module.exports = { analyzeStorageNodes };

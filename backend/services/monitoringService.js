const db = require("../config/db");

const STORAGE_NODES = [
  { nodeId: "node1", url: "http://localhost:7001" },
  { nodeId: "node2", url: "http://localhost:7002" },
  { nodeId: "node3", url: "http://localhost:7003" },
];

async function collectNodeMetrics(node) {
  const startedAt = Date.now();

  try {
    // --------------------------------------------------
    // 1. Get storage metrics
    // --------------------------------------------------

    const response = await fetch(`${node.url}/metrics`, {
      signal: AbortSignal.timeout(3000),
    });

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      throw new Error(
        `Metrics endpoint returned HTTP ${response.status}`
      );
    }

    const metrics = await response.json();

    // Validate metrics response
    if (
      metrics.nodeId !== node.nodeId ||
      !Number.isSafeInteger(metrics.chunkCount) ||
      metrics.chunkCount < 0 ||
      !Number.isSafeInteger(metrics.totalBytes) ||
      metrics.totalBytes < 0
    ) {
      throw new Error("Invalid metrics response");
    }

    // --------------------------------------------------
    // 2. Measure download speed
    // --------------------------------------------------

    let downloadSpeedMbps = 0;

    try {
      const speedStartedAt = Date.now();

      const speedResponse = await fetch(`${node.url}/speed`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!speedResponse.ok) {
        throw new Error(
          `Speed endpoint returned HTTP ${speedResponse.status}`
        );
      }

      const speedBuffer = await speedResponse.arrayBuffer();

      const speedElapsedMs = Date.now() - speedStartedAt;

      if (speedElapsedMs > 0 && speedBuffer.byteLength > 0) {
        downloadSpeedMbps =
          (speedBuffer.byteLength / (1024 * 1024)) /
          (speedElapsedMs / 1000);
      }
    } catch (speedError) {
      console.warn(
        `Speed measurement failed for ${node.nodeId}:`,
        speedError.message
      );
    }

    // --------------------------------------------------
    // 3. Save metrics
    // --------------------------------------------------

    await saveMetric({
      nodeId: node.nodeId,
      isAvailable: true,
      latencyMs,
      chunkCount: metrics.chunkCount,
      totalBytes: metrics.totalBytes,
      downloadSpeedMbps,
    });

    return {
      nodeId: node.nodeId,
      isAvailable: true,
      latencyMs,
      chunkCount: metrics.chunkCount,
      totalBytes: metrics.totalBytes,
      downloadSpeedMbps: Number(
        downloadSpeedMbps.toFixed(2)
      ),
    };
  } catch (error) {
    console.error(
      `Monitoring failed for ${node.nodeId}:`,
      error.message
    );

    // Record failure
    await saveMetric({
      nodeId: node.nodeId,
      isAvailable: false,
      latencyMs: null,
      chunkCount: 0,
      totalBytes: 0,
      downloadSpeedMbps: 0,
    });

    return {
      nodeId: node.nodeId,
      isAvailable: false,
      error: error.message,
    };
  }
}

function saveMetric(metric) {
  return new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO storage_metrics
        (
          node_id,
          is_available,
          latency_ms,
          chunk_count,
          total_bytes,
          download_speed_mbps
        )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        metric.nodeId,
        metric.isAvailable,
        metric.latencyMs,
        metric.chunkCount,
        metric.totalBytes,
        metric.downloadSpeedMbps,
      ],
      (error) => {
        if (error) return reject(error);
        resolve();
      }
    );
  });
}

async function collectAllMetrics() {
  return Promise.all(
    STORAGE_NODES.map((node) =>
      collectNodeMetrics(node)
    )
  );
}

module.exports = {
  collectNodeMetrics,
  collectAllMetrics,
};
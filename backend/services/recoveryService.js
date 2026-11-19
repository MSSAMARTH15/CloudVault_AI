
const fs = require("fs");
const db = require("../config/db");
const crypto = require("crypto");
const {
  retrieveChunk,
  deleteChunk,
} = require("./storageClient");

const { repairChunk } = require("./chunkService");

let recoveryInProgress = false;

const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
const logRecoveryEvent = async (
  chunkId,
  eventType,
  sourceNode,
  targetNode,
  message
) => {
  try {
    await runQuery(
      `INSERT INTO recovery_logs
       (chunk_id, event_type, source_node, target_node, message)
       VALUES (?, ?, ?, ?, ?)`,
      [
        chunkId,
        eventType,
        sourceNode,
        targetNode,
        message,
      ]
    );
  } catch (error) {
    console.error(
      "Failed to save recovery log:",
      error.message
    );
  }
};
// Legacy local-storage compatibility
const getValidChunkPath = (chunk, replicaMap) => {
  if (fs.existsSync(chunk.chunk_path)) {
    return chunk.chunk_path;
  }

  const replica = replicaMap[chunk.chunk_id];

  if (replica && fs.existsSync(replica.replica_path)) {
    return replica.replica_path;
  }

  throw new Error(`Chunk ${chunk.chunk_id} unavailable`);
};

// Background recovery worker
const runBackgroundRecovery = async () => {
  if (recoveryInProgress) {
    console.log("Recovery cycle already running. Skipping.");
    return;
  }

  recoveryInProgress = true;

  await logRecoveryEvent(
  null,
  "cycle_started",
  null,
  null,
  "Background recovery cycle started"
);

  try {
    const chunks = await runQuery(`
      SELECT
        fc.chunk_id,
        fc.checksum,
        fc.node_id AS primary_node_id,
        fc.chunk_path,
        cr.node_id AS replica_node_id,
        cr.replica_path
      FROM file_chunks fc
      LEFT JOIN chunk_replicas cr
        ON fc.chunk_id = cr.chunk_id
   WHERE fc.checksum IS NOT NULL
        `);

    let repairedCount = 0;

    for (const chunk of chunks) {
      const primaryMatch =
        /^remote:(\d+):([a-zA-Z0-9_-]+)$/.exec(
          chunk.chunk_path
        );

      const replicaMatch =
        chunk.replica_path &&
        /^remote:(\d+):([a-zA-Z0-9_-]+)$/.exec(
          chunk.replica_path
        );

      if (!primaryMatch || !replicaMatch) {
        console.warn(
          `Skipping chunk ${chunk.chunk_id}: invalid storage reference`
        );
        continue;
      }

      const primaryNode = Number(primaryMatch[1]);
      const primaryRemoteId = primaryMatch[2];

      const replicaNode = Number(replicaMatch[1]);
      const replicaRemoteId = replicaMatch[2];

      // Check whether the primary is still accessible.
      try {
  const primaryData = await retrieveChunk(
    primaryNode,
    primaryRemoteId
  );

  const primaryHash = crypto
    .createHash("sha256")
    .update(primaryData)
    .digest("hex");

  if (primaryHash === chunk.checksum) {
  continue;
}

console.warn(
  `Corrupted primary detected: chunk ${chunk.chunk_id}`
);

await logRecoveryEvent(
  chunk.chunk_id,
  "primary_corrupted",
  primaryNode,
  null,
  `Primary chunk ${chunk.chunk_id} failed SHA-256 verification`
);
} catch (primaryError) {
  console.warn(
    `Missing or inaccessible primary: chunk ${chunk.chunk_id}`
  );

  await logRecoveryEvent(
    chunk.chunk_id,
    "primary_missing",
    primaryNode,
    null,
    `Primary chunk ${chunk.chunk_id} is unavailable: ${primaryError.message}`
  );
}

      try {
        // Retrieve and integrity-check the replica.
        const data = await retrieveChunk(
          replicaNode,
          replicaRemoteId
        );
        const replicaHash = crypto
  .createHash("sha256")
  .update(data)
  .digest("hex");

if (replicaHash !== chunk.checksum) {
  throw new Error(
    `Replica integrity check failed for chunk ${chunk.chunk_id}`
  );
}
        // Store a replacement on a healthy node.
        const repaired = await repairChunk(
          primaryNode,
          replicaNode,
          data
        );

        // Update metadata only if the original reference is unchanged.
        const result = await runQuery(
          `UPDATE file_chunks
           SET node_id = ?, chunk_path = ?
           WHERE chunk_id = ? AND chunk_path = ?`,
          [
            repaired.nodeId,
            repaired.chunkPath,
            chunk.chunk_id,
            chunk.chunk_path,
          ]
        );

        if (result.affectedRows === 0) {
          await deleteChunk(
            repaired.nodeId,
            repaired.chunkId
          );

          console.log(
            `Chunk ${chunk.chunk_id} was already repaired elsewhere.`
          );

          continue;
        }

        repairedCount++;

await logRecoveryEvent(
  chunk.chunk_id,
  "repair_success",
  primaryNode,
  repaired.nodeId,
  `Chunk ${chunk.chunk_id} successfully repaired and assigned to Node ${repaired.nodeId}`
);

console.log(
  `Background self-healing successful: chunk ${chunk.chunk_id}, new primary node ${repaired.nodeId}`
);
      } catch (error) {
  await logRecoveryEvent(
    chunk.chunk_id,
    "repair_failed",
    primaryNode,
    null,
    `Recovery failed for chunk ${chunk.chunk_id}: ${error.message}`
  );

  console.error(
    `Background recovery failed for chunk ${chunk.chunk_id}:`,
    error.message
  );
}
    }

    console.log(
      `Background recovery cycle completed. Repaired: ${repairedCount}`
    );
    await logRecoveryEvent(
  null,
  "cycle_completed",
  null,
  null,
  `Recovery cycle completed. Repaired ${repairedCount} chunks`
);
  } catch (error) {
  await logRecoveryEvent(
    null,
    "cycle_failed",
    null,
    null,
    `Recovery cycle failed: ${error.message}`
  );

  console.error(
    "Background recovery worker error:",
    error.message
  );
}
finally {
  recoveryInProgress = false;
}
};

module.exports = {
  getValidChunkPath,
  runBackgroundRecovery,
};

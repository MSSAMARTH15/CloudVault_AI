const db = require("../config/db");
const fs = require("fs");
const crypto = require("crypto");

const {
  splitFileIntoChunks,
  repairChunk,
} = require("../services/chunkService");

const {
  retrieveChunk,
  deleteChunk,
} = require("../services/storageClient");


// UPLOAD FILE

const uploadFile = async (req, res) => {
  const userId = req.user.userId;
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      message: "No file uploaded",
    });
  }

  let fileId = null;
  let chunkInfo = [];

  try {
    const insertFile = () =>
      new Promise((resolve, reject) => {
        db.query(
          `INSERT INTO files (user_id, file_name, original_size)
           VALUES (?, ?, ?)`,
          [userId, file.originalname, file.size],
          (err, result) => {
            if (err) return reject(err);
            resolve(result.insertId);
          }
        );
      });

   const insertChunk = (chunk) =>
  new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO file_chunks
       (file_id, chunk_number, node_id, chunk_path, checksum)
       VALUES (?, ?, ?, ?, ?)`,
      [
        fileId,
        chunk.chunkNumber,
        chunk.node,
        chunk.chunkPath,
        chunk.checksum,
      ],
      (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
      }
    );
  });

    const insertReplica = (chunkId, chunk) =>
      new Promise((resolve, reject) => {
        db.query(
          `INSERT INTO chunk_replicas
           (chunk_id, node_id, replica_path)
           VALUES (?, ?, ?)`,
          [
            chunkId,
            chunk.replicaNode,
            chunk.replicaPath,
          ],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });

    fileId = await insertFile();

    // This service now writes primary chunks and replicas remotely.
    chunkInfo = await splitFileIntoChunks(
      file.path,
      file.filename
    );

    for (const chunk of chunkInfo) {
      const chunkId = await insertChunk(chunk);
      await insertReplica(chunkId, chunk);
    }

    return res.status(201).json({
      message: "File Uploaded And Chunked Successfully",
      fileId,
      chunks: chunkInfo,
    });
  } catch (error) {
    console.error("Upload failed:", error.message);

    return res.status(500).json({
      message: "File Upload Failed",
    });
  } finally {
    // Remove Multer's temporary original upload.
    try {
      const fs = require("fs/promises");
      await fs.unlink(file.path);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        console.error(
          "Temporary upload cleanup failed:",
          cleanupError.message
        );
      }
    }
  }
};


// DOWNLOAD FILE



const downloadFile = async (req, res) => {
  // console.log("🔥 DOWNLOAD FILE CONTROLLER HIT", req.params.fileId);
  const fileId = req.params.fileId;
  const userId = req.user.userId;

  const runQuery = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

  const calculateHash = (buffer) =>
    crypto.createHash("sha256").update(buffer).digest("hex");

  try {
    // 1. Verify file ownership
    const files = await runQuery(
      `SELECT file_id, file_name
       FROM files
       WHERE file_id = ? AND user_id = ?`,
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({
        message: "File Not Found",
      });
    }

    const file = files[0];

    // 2. Fetch chunks
    const chunks = await runQuery(
      `SELECT * FROM file_chunks
       WHERE file_id = ?
       ORDER BY chunk_number`,
      [fileId]
    );

    if (chunks.length === 0) {
      return res.status(404).json({
        message: "No chunks found",
      });
    }

    // 3. Fetch replicas
    const replicas = await runQuery(
      `SELECT cr.*
       FROM chunk_replicas cr
       INNER JOIN file_chunks fc
         ON cr.chunk_id = fc.chunk_id
       WHERE fc.file_id = ?`,
      [fileId]
    );

    const replicaMap = new Map();

    for (const replica of replicas) {
      replicaMap.set(replica.chunk_id, replica);
    }

    const buffers = [];

    // 4. Process each chunk
    for (const chunk of chunks) {
      const primaryMatch =
        /^remote:(\d+):([a-zA-Z0-9_-]+)$/.exec(
          chunk.chunk_path
        );

      if (!primaryMatch) {
        return res.status(500).json({
          message: `Unsupported storage reference for chunk ${chunk.chunk_id}`,
        });
      }

      const primaryNode = Number(primaryMatch[1]);
      const primaryRemoteId = primaryMatch[2];

      let primaryValid = false;

      // 5. Retrieve and verify primary
      try {
        const primaryData = await retrieveChunk(
          primaryNode,
          primaryRemoteId
        );

        if (chunk.checksum) {
          const primaryHash = calculateHash(primaryData);

          if (primaryHash !== chunk.checksum) {
            console.warn(
              `Corrupted primary detected during download: chunk ${chunk.chunk_id}`
            );
          } else {
            primaryValid = true;
          }
        } else {
          // Legacy chunks uploaded before checksum tracking
          console.warn(
            `Chunk ${chunk.chunk_id} has no stored checksum. Using legacy validation.`
          );

          primaryValid = true;
        }

        if (primaryValid) {
          buffers.push(primaryData);
          continue;
        }
      } catch (primaryError) {
        console.warn(
          `Primary chunk ${chunk.chunk_id} unavailable; trying replica`
        );
      }

      // 6. Retrieve replica
      const replica = replicaMap.get(chunk.chunk_id);

      const replicaMatch =
        replica &&
        /^remote:(\d+):([a-zA-Z0-9_-]+)$/.exec(
          replica.replica_path
        );

      if (!replicaMatch) {
        return res.status(500).json({
          message: `Primary and replica unavailable for chunk ${chunk.chunk_id}`,
        });
      }

      const replicaNode = Number(replicaMatch[1]);
      const replicaRemoteId = replicaMatch[2];

      let data;

      try {
        data = await retrieveChunk(
          replicaNode,
          replicaRemoteId
        );

        // 7. Verify replica against trusted checksum
        if (chunk.checksum) {
          const replicaHash = calculateHash(data);

          if (replicaHash !== chunk.checksum) {
            throw new Error(
              `Replica checksum mismatch for chunk ${chunk.chunk_id}`
            );
          }
        }

        console.log(
          `Replica integrity verified for chunk ${chunk.chunk_id}`
        );

        // Use recovered data for reconstruction
        buffers.push(data);
      } catch (replicaError) {
        console.error(
          `Replica recovery failed for chunk ${chunk.chunk_id}:`,
          replicaError.message
        );

        return res.status(500).json({
          message: `Unable to recover chunk ${chunk.chunk_id}`,
        });
      }

      // 8. Repair missing or corrupted primary
      let repaired = null;

      try {
        repaired = await repairChunk(
          primaryNode,
          replicaNode,
          data
        );

        // 9. Update database metadata
        const updateResult = await runQuery(
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

        if (updateResult.affectedRows === 0) {
          await deleteChunk(
            repaired.nodeId,
            repaired.chunkId
          );

          console.warn(
            `Chunk ${chunk.chunk_id} metadata was already updated elsewhere`
          );
        } else {
          console.log(
            `Download-time self-healing successful: chunk ${chunk.chunk_id}, new primary node ${repaired.nodeId}`
          );
        }
      } catch (repairError) {
        // Clean up replacement if metadata update failed
        if (repaired) {
          try {
            await deleteChunk(
              repaired.nodeId,
              repaired.chunkId
            );
          } catch (cleanupError) {
            console.error(
              "Replacement cleanup failed:",
              cleanupError.message
            );
          }
        }

        console.error(
          `Primary repair failed for chunk ${chunk.chunk_id}:`,
          repairError.message
        );

        // Download can still continue using verified replica data
      }
    }

    // 10. Reconstruct original file
    const fileBuffer = Buffer.concat(buffers);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.file_name.replace(/["\r\n]/g, "_")}"`
    );

    return res.send(fileBuffer);

  } catch (error) {
    console.error("Download failed:", error.message);

    return res.status(500).json({
      message: "File Reconstruction Failed",
    });
  }
};




// LIST USER FILES
const getMyFiles = (req, res) => {
  try {
    const userId = req.user.userId;

    const query = `
      SELECT
      file_id,
      file_name,
      original_size
      FROM files
      WHERE user_id = ?
      ORDER BY file_id DESC
    `;

    db.query(
  query,
  [userId],
  (err, results) => {

    console.log("USER ID:", userId);
    console.log("FILES:", results);

    if (err) {
      return res.status(500).json({
        message: "Database Error",
        error: err,
      });
    }

    res.status(200).json(results);
  }
);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error,
    });
  }
};

// DELETE FILE


const deleteFile = (req, res) => {
  const fileId = req.params.fileId;
  const userId = req.user.userId;

  // 1. Verify that this file belongs to the logged-in user
  const ownershipQuery =
    "SELECT file_id FROM files WHERE file_id = ? AND user_id = ?";

  db.query(ownershipQuery, [fileId, userId], (err, fileResults) => {
    if (err) {
      console.error("Ownership check failed:", err.message);
      return res.status(500).json({
        message: "Database Error",
      });
    }

    if (fileResults.length === 0) {
      return res.status(404).json({
        message: "File Not Found",
      });
    }

    // 2. Get the primary chunks
    const chunkQuery = `
      SELECT chunk_id, chunk_path
      FROM file_chunks
      WHERE file_id = ?
    `;

    db.query(chunkQuery, [fileId], (err, chunks) => {
      if (err) {
        console.error("Chunk lookup failed:", err.message);
        return res.status(500).json({
          message: "Database Error",
        });
      }

      // 3. Get replicas belonging to this file's chunks
      const replicaQuery = `
        SELECT cr.replica_id, cr.replica_path
        FROM chunk_replicas cr
        INNER JOIN file_chunks fc
          ON cr.chunk_id = fc.chunk_id
        WHERE fc.file_id = ?
      `;

      db.query(replicaQuery, [fileId], (err, replicas) => {
        if (err) {
          console.error("Replica lookup failed:", err.message);
          return res.status(500).json({
            message: "Database Error",
          });
        }

        // 4. Delete replica metadata first
        const deleteReplicasQuery = `
          DELETE FROM chunk_replicas
          WHERE chunk_id IN (
            SELECT chunk_id
            FROM file_chunks
            WHERE file_id = ?
          )
        `;

        db.query(deleteReplicasQuery, [fileId], (err) => {
          if (err) {
            console.error("Replica deletion failed:", err.message);
            return res.status(500).json({
              message: "Delete Failed",
            });
          }

          // 5. Delete chunk metadata
          db.query(
            "DELETE FROM file_chunks WHERE file_id = ?",
            [fileId],
            (err) => {
              if (err) {
                console.error("Chunk deletion failed:", err.message);
                return res.status(500).json({
                  message: "Delete Failed",
                });
              }

              // 6. Delete the file record
              db.query(
                "DELETE FROM files WHERE file_id = ? AND user_id = ?",
                [fileId, userId],
                (err, result) => {
                  if (err) {
                    console.error("File deletion failed:", err.message);
                    return res.status(500).json({
                      message: "Delete Failed",
                    });
                  }

                  if (result.affectedRows === 0) {
                    return res.status(404).json({
                      message: "File Not Found",
                    });
                  }

                  // 7. Clean up stored chunk and replica files
                
// 7. Clean up stored chunks and replicas from Docker nodes.
const paths = [
  ...chunks.map((chunk) => chunk.chunk_path),
  ...replicas.map((replica) => replica.replica_path),
];

const cleanupTasks = paths.map(async (storedPath) => {
  if (!storedPath) return;

  // Remote storage reference format: remote:nodeId:chunkId
  const match =
    /^remote:(\d+):([a-zA-Z0-9_-]+)$/.exec(storedPath);

  if (match) {
    const nodeId = Number(match[1]);
    const remoteChunkId = match[2];

    await deleteChunk(nodeId, remoteChunkId);
    return;
  }

  // Backward compatibility for old local files.
  if (fs.existsSync(storedPath)) {
    fs.unlinkSync(storedPath);
  }
});

Promise.allSettled(cleanupTasks).then((results) => {
  const failed = results.filter(
    (result) => result.status === "rejected"
  );

  if (failed.length > 0) {
    failed.forEach((result) => {
      console.error(
        "Storage cleanup failed:",
        result.reason.message
      );
    });

    return res.status(200).json({
      message:
        "File metadata deleted, but some stored chunks may remain in storage.",
    });
  }

  return res.status(200).json({
    message: "File and stored chunks deleted successfully",
  });
});

                }
              );
            }
          );
        });
      });
    });
  });
};



const simulateFailure = (req, res) => {
  const fileId = req.params.fileId;
  const userId = req.user.userId;

  const ownershipQuery =
    "SELECT file_id FROM files WHERE file_id = ? AND user_id = ?";

  db.query(ownershipQuery, [fileId, userId], (err, fileResults) => {
    if (err) {
      console.error("Ownership check failed:", err.message);
      return res.status(500).json({
        message: "Database Error",
      });
    }

    if (fileResults.length === 0) {
      return res.status(404).json({
        message: "File Not Found",
      });
    }

    const chunkQuery = `
      SELECT chunk_id, chunk_path
      FROM file_chunks
      WHERE file_id = ?
      ORDER BY chunk_number
      LIMIT 1
    `;

    db.query(chunkQuery, [fileId], async (err, results) => {
      if (err) {
        console.error("Chunk lookup failed:", err.message);
        return res.status(500).json({
          message: "Database Error",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "No chunks found",
        });
      }

      const chunk = results[0];

      try {
        const match =
          /^remote:(\d+):([a-zA-Z0-9_-]+)$/.exec(chunk.chunk_path);

        if (match) {
          const nodeId = Number(match[1]);
          const remoteChunkId = match[2];

          const deleted = await deleteChunk(nodeId, remoteChunkId);

          if (!deleted) {
            return res.status(404).json({
              message: "Primary chunk already missing",
              chunk: chunk.chunk_id,
            });
          }

          return res.status(200).json({
            message: "Node Failure Simulated",
            chunk: chunk.chunk_id,
            nodeId,
          });
        }

        // Backward compatibility for older local storage.
        if (fs.existsSync(chunk.chunk_path)) {
          fs.unlinkSync(chunk.chunk_path);

          return res.status(200).json({
            message: "Node Failure Simulated",
            chunk: chunk.chunk_id,
          });
        }

        return res.status(404).json({
          message: "Chunk already missing",
          chunk: chunk.chunk_id,
        });

      } catch (error) {
        console.error("Failure simulation error:", error.message);

        return res.status(500).json({
          message: "Failure Simulation Failed",
        });
      }
    });
  });
};


const getReplicationData = async (req, res) => {
  try {
    const userId = req.user.userId;

    const query = `
      SELECT
        f.file_id,
        f.file_name,
        f.original_size,
        f.upload_time,
        fc.chunk_id,
        fc.chunk_number,
        fc.node_id AS primary_node,
        cr.node_id AS replica_node,
        CASE
          WHEN cr.replica_id IS NOT NULL THEN 'Registered'
          ELSE 'Missing'
        END AS replica_status
      FROM files f
      INNER JOIN file_chunks fc
        ON f.file_id = fc.file_id
      LEFT JOIN chunk_replicas cr
        ON fc.chunk_id = cr.chunk_id
      WHERE f.user_id = ?
      ORDER BY f.upload_time DESC, fc.chunk_number ASC
    `;

    db.query(query, [userId], (error, results) => {
      if (error) {
        console.error("Replication data error:", error.message);

        return res.status(500).json({
          success: false,
          message: "Failed to fetch replication data",
        });
      }

      const totalChunks = results.length;

      const replicatedChunks = results.filter(
        (row) => row.replica_node !== null
      ).length;

      res.json({
        success: true,
        summary: {
          totalChunks,
          replicatedChunks,
          missingReplicas: totalChunks - replicatedChunks,
          replicationCoverage:
            totalChunks === 0
              ? 0
              : Number(
                  ((replicatedChunks / totalChunks) * 100).toFixed(2)
                ),
        },
        chunks: results,
      });
    });
  } catch (error) {
    console.error("Replication controller error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch replication data",
    });
  }
};

exports.uploadFile = uploadFile;
exports.downloadFile = downloadFile;
exports.getMyFiles = getMyFiles;
exports.deleteFile = deleteFile;
exports.simulateFailure = simulateFailure;
exports.getReplicationData = getReplicationData;
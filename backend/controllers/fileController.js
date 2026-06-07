const db = require("../config/db");
const fs = require("fs");

const {
  splitFileIntoChunks,
} = require("../services/chunkService");

// UPLOAD FILE
const uploadFile = (req, res) => {
  try {
    const userId = req.user.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const query = `
      INSERT INTO files
      (user_id, file_name, original_size)
      VALUES (?, ?, ?)
    `;

    db.query(
      query,
      [userId, file.originalname, file.size],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            message: "Database Error",
            error: err,
          });
        }

        const fileId = result.insertId;

        const chunkInfo = splitFileIntoChunks(
          file.path,
          file.filename
        );

        chunkInfo.forEach((chunk) => {
          const chunkQuery = `
            INSERT INTO file_chunks
            (file_id, chunk_number, node_id, chunk_path)
            VALUES (?, ?, ?, ?)
          `;

          db.query(
            chunkQuery,
            [
              fileId,
              chunk.chunkNumber,
              chunk.node,
              chunk.chunkPath,
            ],
            (err, chunkResult) => {
              if (err) {
                console.log(err);
                return;
              }

              const chunkId =
                chunkResult.insertId;

              const replicaQuery = `
                INSERT INTO chunk_replicas
                (chunk_id, node_id, replica_path)
                VALUES (?, ?, ?)
              `;

              db.query(
                replicaQuery,
                [
                  chunkId,
                  chunk.replicaNode,
                  chunk.replicaPath,
                ]
              );
            }
          );
        });

        res.status(201).json({
          message:
            "File Uploaded And Chunked Successfully",
          chunks: chunkInfo,
        });
      }
    );
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
      error,
    });
  }
};

// DOWNLOAD FILE
const downloadFile = (req, res) => {
  try {
    const fileId = req.params.fileId;

    const fileQuery =
      "SELECT * FROM files WHERE file_id = ?";

    db.query(
      fileQuery,
      [fileId],
      (err, fileResults) => {
        if (err) {
          return res.status(500).json({
            message: "Database Error",
            error: err,
          });
        }

        if (fileResults.length === 0) {
          return res.status(404).json({
            message: "File Not Found",
          });
        }

        const file = fileResults[0];

        const chunkQuery = `
          SELECT *
          FROM file_chunks
          WHERE file_id = ?
          ORDER BY chunk_number
        `;

        db.query(
          chunkQuery,
          [fileId],
          (err, chunkResults) => {
            if (err) {
              return res.status(500).json({
                message: "Database Error",
                error: err,
              });
            }

            const replicaQuery =
              "SELECT * FROM chunk_replicas";

            db.query(
              replicaQuery,
              (err, replicaResults) => {
                if (err) {
                  return res.status(500).json({
                    message: "Database Error",
                    error: err,
                  });
                }

                const replicaMap = {};

                replicaResults.forEach(
                  (replica) => {
                    replicaMap[
                      replica.chunk_id
                    ] = replica;
                  }
                );

                const buffers = [];

                for (const chunk of chunkResults) {
                  let chunkPath =
                    chunk.chunk_path;

                  if (
                    !fs.existsSync(
                      chunkPath
                    )
                  ) {
                    const replica =
                      replicaMap[
                        chunk.chunk_id
                      ];

                    if (
                      replica &&
                      fs.existsSync(
                        replica.replica_path
                      )
                    ) {
                      chunkPath =
                        replica.replica_path;

                      console.log(
                        `Recovery used for chunk ${chunk.chunk_id}`
                      );
                    } else {
                      return res
                        .status(500)
                        .json({
                          message:
                            "Chunk and replica both missing",
                        });
                    }
                  }

                  const data =
                    fs.readFileSync(
                      chunkPath
                    );

                  buffers.push(data);
                }

                const fileBuffer =
                  Buffer.concat(
                    buffers
                  );

                res.setHeader(
                  "Content-Disposition",
                  `attachment; filename=${file.file_name}`
                );

                res.send(fileBuffer);
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
      error,
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
  try {
    const fileId = req.params.fileId;

    const chunkQuery = `
      SELECT *
      FROM file_chunks
      WHERE file_id = ?
    `;

    db.query(
      chunkQuery,
      [fileId],
      (err, chunks) => {
        if (err) {
          return res.status(500).json({
            message: "Database Error",
          });
        }

        chunks.forEach((chunk) => {
          if (
            fs.existsSync(
              chunk.chunk_path
            )
          ) {
            fs.unlinkSync(
              chunk.chunk_path
            );
          }
        });

        const replicaQuery = `
          SELECT *
          FROM chunk_replicas
          WHERE chunk_id IN (
            SELECT chunk_id
            FROM file_chunks
            WHERE file_id = ?
          )
        `;

        db.query(
          replicaQuery,
          [fileId],
          (err, replicas) => {
            if (!err) {
              replicas.forEach(
                (replica) => {
                  if (
                    fs.existsSync(
                      replica.replica_path
                    )
                  ) {
                    fs.unlinkSync(
                      replica.replica_path
                    );
                  }
                }
              );
            }

            db.query(
              `
              DELETE FROM chunk_replicas
              WHERE chunk_id IN (
                SELECT chunk_id
                FROM file_chunks
                WHERE file_id = ?
              )
            `,
              [fileId],
              () => {
                db.query(
                  `
                  DELETE FROM file_chunks
                  WHERE file_id = ?
                `,
                  [fileId],
                  () => {
                    db.query(
                      `
                      DELETE FROM files
                      WHERE file_id = ?
                      `,
                      [fileId],
                      (err) => {
                        if (err) {
                          return res
                            .status(500)
                            .json({
                              message:
                                "Delete Failed",
                            });
                        }

                        res.json({
                          message:
                            "File Deleted Successfully",
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};



const simulateFailure = (req, res) => {
  try {
    const fileId = req.params.fileId;

    const query = `
      SELECT *
      FROM file_chunks
      WHERE file_id = ?
      LIMIT 1
    `;

    db.query(
      query,
      [fileId],
      (err, results) => {
        if (err) {
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

        if (
          fs.existsSync(
            chunk.chunk_path
          )
        ) {
          fs.unlinkSync(
            chunk.chunk_path
          );

          return res.json({
            message:
              "Node Failure Simulated",
            chunk:
              chunk.chunk_id,
          });
        }

        res.json({
          message:
            "Chunk already missing",
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
};

exports.uploadFile = uploadFile;
exports.downloadFile = downloadFile;
exports.getMyFiles = getMyFiles;
exports.deleteFile = deleteFile;
exports.simulateFailure = simulateFailure;
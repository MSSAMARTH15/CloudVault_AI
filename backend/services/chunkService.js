
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const {
  storeChunk,
  retrieveChunk,
  checkNodeHealth,
} = require("./storageClient");

const NODE_IDS = [1, 2, 3];

const splitFileIntoChunks = async (filePath, fileName) => {
  const fileBuffer = await fs.readFile(filePath);

  if (fileBuffer.length === 0) {
    throw new Error("Cannot split an empty file");
  }

  const chunkSize = Math.ceil(fileBuffer.length / 3);
  const chunks = [];

  for (
    let offset = 0;
    offset < fileBuffer.length;
    offset += chunkSize
  ) {
    chunks.push(fileBuffer.subarray(offset, offset + chunkSize));
  }

  const chunkInfo = [];
  const storedChunks = [];

  try {
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const chunkNumber = index + 1;

      // Stable, filesystem-safe identifiers for remote storage.
      const chunkId = crypto.randomUUID();
      const replicaId = crypto.randomUUID();

      const node = NODE_IDS[index];
      const replicaNode = NODE_IDS[(index + 1) % NODE_IDS.length];

      // Store the primary chunk and its replica on different nodes.
      const primaryResult = await storeChunk(
  node,
  chunkId,
  chunk
);

storedChunks.push({ node, chunkId });

const replicaResult = await storeChunk(
  replicaNode,
  replicaId,
  chunk
);

storedChunks.push({
  node: replicaNode,
  chunkId: replicaId,
});

      chunkInfo.push({
        chunkNumber,
        node,
        chunkName: `${fileName}_chunk_${chunkNumber}`,
        chunkPath: `remote:${node}:${chunkId}`,
        replicaNode,
        replicaPath: `remote:${replicaNode}:${replicaId}`,
        checksum: primaryResult.sha256,
      });
    }

    return chunkInfo;
  } catch (error) {
    // Best-effort cleanup if any remote write fails.
    await Promise.allSettled(
      storedChunks.map(({ node, chunkId }) =>
        require("./storageClient").deleteChunk(node, chunkId)
      )
    );

    throw error;
  }
};
const repairChunk = async (
  primaryNode,
  replicaNode,
  chunkBuffer
) => {
  // Try the original primary node first.
  // If unavailable, try the remaining nodes.
  const candidateNodes = [
    primaryNode,
    ...NODE_IDS.filter((node) => node !== primaryNode),
  ].filter((node) => node !== replicaNode);

  for (const nodeId of candidateNodes) {
    try {
      await checkNodeHealth(nodeId);

      const newChunkId = crypto.randomUUID();

      await storeChunk(nodeId, newChunkId, chunkBuffer);

      return {
        nodeId,
        chunkId: newChunkId,
        chunkPath: `remote:${nodeId}:${newChunkId}`,
      };
    } catch (error) {
      console.warn(
        `Repair attempt on node ${nodeId} failed:`,
        error.message
      );
    }
  }

  throw new Error("Unable to repair chunk: no healthy storage node available");
};

module.exports = {
  splitFileIntoChunks,
  repairChunk,
};
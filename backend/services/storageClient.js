
const crypto = require("crypto");

const STORAGE_NODES = {
  1: process.env.STORAGE_NODE_1 || "http://localhost:7001",
  2: process.env.STORAGE_NODE_2 || "http://localhost:7002",
  3: process.env.STORAGE_NODE_3 || "http://localhost:7003",
};

function getNodeUrl(nodeId) {
  const url = STORAGE_NODES[nodeId];

  if (!url) {
    throw new Error(`Unknown storage node: ${nodeId}`);
  }

  return url;
}

async function checkNodeHealth(nodeId) {
  const response = await fetch(
    `${getNodeUrl(nodeId)}/health`,
    { signal: AbortSignal.timeout(3000) }
  );

  if (!response.ok) {
    throw new Error(`Storage node ${nodeId} is unhealthy`);
  }

  return response.json();
}

async function storeChunk(nodeId, chunkId, buffer) {
  const data = buffer.toString("base64");

  const response = await fetch(
    `${getNodeUrl(nodeId)}/chunks/${chunkId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to store chunk on node ${nodeId}: HTTP ${response.status}`
    );
  }

  const result = await response.json();

  const expectedHash = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  if (result.sha256 !== expectedHash) {
    throw new Error(`Checksum mismatch for chunk ${chunkId}`);
  }

  return result;
}

async function retrieveChunk(nodeId, chunkId) {
  const response = await fetch(
    `${getNodeUrl(nodeId)}/chunks/${chunkId}`,
    { signal: AbortSignal.timeout(30000) }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to retrieve chunk ${chunkId} from node ${nodeId}: HTTP ${response.status}`
    );
  }

  const result = await response.json();
  const buffer = Buffer.from(result.data, "base64");

  const actualHash = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  if (
    actualHash !== result.sha256 ||
    buffer.length !== result.size
  ) {
    throw new Error(`Stored chunk failed integrity check: ${chunkId}`);
  }

  return buffer;
}

async function deleteChunk(nodeId, chunkId) {
  const response = await fetch(
    `${getNodeUrl(nodeId)}/chunks/${chunkId}`,
    {
      method: "DELETE",
      signal: AbortSignal.timeout(10000),
    }
  );

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to delete chunk ${chunkId} from node ${nodeId}`
    );
  }

  return true;
}

module.exports = {
  checkNodeHealth,
  storeChunk,
  retrieveChunk,
  deleteChunk,
};

const fs = require("fs");

const getValidChunkPath = (
  chunk,
  replicaMap
) => {
  if (
    fs.existsSync(chunk.chunk_path)
  ) {
    return chunk.chunk_path;
  }

  const replica =
    replicaMap[chunk.chunk_id];

  if (
    replica &&
    fs.existsSync(
      replica.replica_path
    )
  ) {
    return replica.replica_path;
  }

  throw new Error(
    `Chunk ${chunk.chunk_id} unavailable`
  );
};

module.exports = {
  getValidChunkPath,
};
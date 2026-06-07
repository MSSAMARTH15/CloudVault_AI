const fs = require("fs");
const path = require("path");

const splitFileIntoChunks = (filePath, fileName) => {
  const fileBuffer = fs.readFileSync(filePath);

  const chunkSize = Math.ceil(fileBuffer.length / 3);

  const chunks = [
    fileBuffer.slice(0, chunkSize),
    fileBuffer.slice(chunkSize, chunkSize * 2),
    fileBuffer.slice(chunkSize * 2),
  ];

  const nodes = [
    "storage/node1",
    "storage/node2",
    "storage/node3",
  ];

  const replicaNodes = [
    "storage/node2",
    "storage/node3",
    "storage/node1",
  ];

  const chunkInfo = [];

  chunks.forEach((chunk, index) => {
    const chunkName =
      `${fileName}_chunk_${index + 1}`;

    const chunkPath = path.join(
      nodes[index],
      chunkName
    );

    fs.writeFileSync(chunkPath, chunk);

    const replicaName =
      `${fileName}_chunk_${index + 1}_replica`;

    const replicaPath = path.join(
      replicaNodes[index],
      replicaName
    );

    fs.writeFileSync(replicaPath, chunk);

    chunkInfo.push({
      chunkNumber: index + 1,

      node: index + 1,

      chunkName,

      chunkPath,

      replicaNode:
        index === 0
          ? 2
          : index === 1
          ? 3
          : 1,

      replicaPath,
    });
  });

  return chunkInfo;
};

module.exports = {
  splitFileIntoChunks,
};
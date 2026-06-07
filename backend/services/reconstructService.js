const fs = require("fs");

const reconstructFile = (chunks) => {
  const buffers = [];

  chunks.forEach((chunk) => {
    if (
      fs.existsSync(chunk.chunk_path)
    ) {
      const data =
        fs.readFileSync(
          chunk.chunk_path
        );

      buffers.push(data);
    } else {
      throw new Error(
        `Missing chunk: ${chunk.chunk_path}`
      );
    }
  });

  return Buffer.concat(buffers);
};

module.exports = {
  reconstructFile,
};
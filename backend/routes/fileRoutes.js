const express = require("express");

const router = express.Router();

const verifyToken =
  require("../middleware/authMiddleware");

const upload =
  require("../middleware/uploadMiddleware");

const {
  uploadFile,
  downloadFile,
  getMyFiles,
  deleteFile,
  simulateFailure,
} = require("../controllers/fileController");



router.get(
  "/myfiles",
  verifyToken,
  getMyFiles
);

router.post(
  "/upload",
  verifyToken,
  upload.single("file"),
  uploadFile
);

router.get(
  "/download/:fileId",
  verifyToken,
  downloadFile
);

router.delete(
  "/delete/:fileId",
  verifyToken,
  deleteFile
);


router.post(
  "/simulate-failure/:fileId",
  verifyToken,
  simulateFailure
);


module.exports = router;
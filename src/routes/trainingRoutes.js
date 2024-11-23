const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { uploadTrainingImage } = require("../controllers/trainingController");
const {
  addTrainingSession,
  getAllTrainings,
  getTrainingById,
  updateTrainingSession,
  deleteTrainingSession,
  getMonthlySummary,
} = require("../controllers/trainingController");

const upload = multer({
  dest: path.join(__dirname, "../uploads/temp"),
});

router.post("/upload-image", upload.single("image"), uploadTrainingImage);
router.post("/", addTrainingSession);
router.get("/", getAllTrainings);
router.get("/:id", getTrainingById);
router.get("/summary/:month/:year", getMonthlySummary);
router.put("/:id", updateTrainingSession);
router.delete("/:id", deleteTrainingSession);

module.exports = router;

const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadTrainingImage } = require("../controllers/trainingController");
const {
  addTrainingSession,
  getAllTrainings,
  getTrainingById,
  updateTrainingSession,
  deleteTrainingSession,
  getMonthlySummary,
} = require("../controllers/trainingController");

const upload = multer({ dest: "uploads/" });

router.post("/upload-image", upload.single("image"), uploadTrainingImage);
router.post("/", addTrainingSession); // Training hinzufügen
router.get("/", getAllTrainings); // Alle Trainings des Nutzers abrufen
router.get("/:id", getTrainingById); // Einzelnes Training abrufen
router.put("/:id", updateTrainingSession); // Training aktualisieren
router.delete("/:id", deleteTrainingSession); // Training löschen
router.get("/summary/:month/:year", getMonthlySummary); // Monatliche Zusammenfassung

module.exports = router;

const TrainingSession = require("../models/TrainingSession");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const fs = require("fs/promises");

// Bild hochladen und verarbeiten
exports.uploadTrainingImage = async (req, res) => {
  try {
    const { path } = req.file;

    // Preprocessing: Bild optimieren (Kontrast, Zuschneiden)
    const processedImage = await sharp(path)
      .grayscale() // Schwarz-Weiß machen
      .normalize() // Helligkeit und Kontrast anpassen
      .toBuffer();

    // OCR: Text extrahieren
    const result = await Tesseract.recognize(processedImage, "eng", {
      logger: (m) => console.log(m),
    });

    // Temporäre Datei löschen
    await fs.unlink(path);

    // Extrahierte Daten (z. B. Dauer, Kalorien) verarbeiten
    const extractedText = result.data.text;
    const parsedData = parseTrainingData(extractedText);

    res
      .status(200)
      .json({ message: "Image processed successfully", parsedData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Funktion zum Extrahieren der Trainingsdaten aus dem Text
function parseTrainingData(text) {
  const durationMatch = text.match(/Dauer.*?(\d+:\d+)/); // Beispiel: "Dauer der Übung: 38:19"
  const caloriesMatch = text.match(/Kalorien.*?(\d+)/); // Beispiel: "500 kcal"
  const distanceMatch = text.match(/Entfernung.*?([\d.]+)/); // Beispiel: "4.23 km"

  return {
    duration: durationMatch ? durationMatch[1] : null,
    calories: caloriesMatch ? parseInt(caloriesMatch[1], 10) : null,
    distance: distanceMatch ? parseFloat(distanceMatch[1]) : null,
  };
}

// 1. Training hinzufügen
exports.addTrainingSession = async (req, res) => {
  const {
    user_id,
    date,
    duration,
    calories_burned,
    distance,
    avg_speed,
    elevation,
    calories_per_hour,
    heart_rate,
    device,
  } = req.body;

  try {
    const trainingSession = new TrainingSession({
      user_id,
      date,
      duration,
      calories_burned,
      distance,
      avg_speed,
      elevation,
      calories_per_hour,
      heart_rate,
      device,
    });

    await trainingSession.save();
    res.status(201).json({
      message: "Training session added successfully",
      trainingSession,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 2. Alle Trainings des Nutzers abrufen
exports.getAllTrainings = async (req, res) => {
  const { user_id } = req.query; // Nutzer-ID als Query-Parameter

  try {
    const trainings = await TrainingSession.find({ user_id }).sort({
      date: -1,
    });
    res.status(200).json(trainings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 3. Einzelnes Training abrufen
exports.getTrainingById = async (req, res) => {
  const { id } = req.params;

  try {
    const training = await TrainingSession.findById(id);
    if (!training) throw new Error("Training session not found");
    res.status(200).json(training);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 4. Training aktualisieren
exports.updateTrainingSession = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updatedTraining = await TrainingSession.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );
    if (!updatedTraining) throw new Error("Training session not found");
    res.status(200).json({
      message: "Training session updated successfully",
      updatedTraining,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 5. Training löschen
exports.deleteTrainingSession = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedTraining = await TrainingSession.findByIdAndDelete(id);
    if (!deletedTraining) throw new Error("Training session not found");
    res.status(200).json({ message: "Training session deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 6. Monatliche Zusammenfassung
exports.getMonthlySummary = async (req, res) => {
  const { month, year } = req.params;
  const { user_id } = req.query;

  try {
    const startDate = new Date(year, month - 1, 1); // Monat beginnt am ersten Tag
    const endDate = new Date(year, month, 0); // Letzter Tag des Monats

    const trainings = await TrainingSession.find({
      user_id,
      date: { $gte: startDate, $lte: endDate },
    });

    // Summiere die Werte
    const summary = trainings.reduce(
      (acc, training) => {
        acc.total_duration += training.duration;
        acc.total_calories += training.calories_burned || 0;
        acc.total_distance += training.distance || 0;
        return acc;
      },
      { total_duration: 0, total_calories: 0, total_distance: 0 }
    );

    // Formatiere die Dauer (Sekunden -> Stunden:Minuten:Sekunden)
    const hours = Math.floor(summary.total_duration / 3600);
    const minutes = Math.floor((summary.total_duration % 3600) / 60);
    const seconds = summary.total_duration % 60;

    res.status(200).json({
      total_duration: `${hours} Std, ${minutes} Min, ${seconds} Sek`,
      total_calories: summary.total_calories,
      total_distance: summary.total_distance,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

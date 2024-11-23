require("dotenv").config();
const path = require("path");
const exifParser = require("exif-parser");
const fs = require("fs/promises");
const sharp = require("sharp");
const vision = require("@google-cloud/vision");
const { GoogleAuth, grpc } = require("google-gax");
const TrainingSession = require("../models/TrainingSession");

// API-Schlüssel direkt verwenden
function getApiKeyCredentials(apiKey) {
  const sslCreds = grpc.credentials.createSsl();
  const googleAuth = new GoogleAuth();
  const authClient = googleAuth.fromAPIKey(apiKey);
  const credentials = grpc.credentials.combineChannelCredentials(
    sslCreds,
    grpc.credentials.createFromGoogleCredential(authClient)
  );
  return credentials;
}

exports.uploadTrainingImage = async (req, res) => {
  try {
    const { path: tempPath, originalname } = req.file;

    // 1. Validierung des Dateiformats
    const metadata = await sharp(tempPath).metadata();
    if (!["jpeg", "png", "gif"].includes(metadata.format)) {
      throw new Error(
        `Invalid file format: ${metadata.format}. Only JPEG, PNG, and GIF are supported.`
      );
    }

    // 2. Konvertiere GIF oder PNG zu JPEG (falls nötig)
    if (metadata.format !== "jpeg") {
      const convertedImage = await sharp(tempPath).toFormat("jpeg").toBuffer();
      await fs.writeFile(tempPath, convertedImage);
    }

    // 3. Metadaten mit EXIF-Datum extrahieren
    let exifData;
    try {
      const fileBuffer = await fs.readFile(tempPath);
      const parser = exifParser.create(fileBuffer);
      exifData = parser.parse();
    } catch (error) {
      console.error("Error parsing EXIF data:", error.message);
      exifData = {}; // Fallback
    }

    // Versuche, das Erstellungsdatum aus den EXIF-Daten zu extrahieren
    const imageDate = extractDateFromExif(exifData);

    // Fallback auf das aktuelle Datum, falls kein Datum gefunden wird
    const trainingDate = imageDate || new Date();

    // 4. Bildvorverarbeitung
    const processedImage = await sharp(tempPath)
      .resize({ width: 800 }) // Verkleinern für bessere OCR
      .grayscale() // Schwarz-Weiß-Konvertierung
      .normalize() // Kontrast und Helligkeit anpassen
      .toBuffer();

    // Speichern des verarbeiteten Bildes
    const processedImagePath = path.join(
      __dirname,
      "../uploads/temp",
      `${Date.now()}-${originalname}.jpeg`
    );
    await fs.writeFile(processedImagePath, processedImage);

    // 5. Google Vision API-Aufruf mit API-Schlüssel
    const sslCreds = getApiKeyCredentials(process.env.GOOGLE_API_KEY);
    const client = new vision.ImageAnnotatorClient({ sslCreds });

    const processedImageBuffer = await fs.readFile(processedImagePath);
    const base64Image = processedImageBuffer.toString("base64");

    const [result] = await client.textDetection({
      image: { content: base64Image },
    });

    const extractedText = result.textAnnotations[0]?.description || "";

    // Extrahierte Daten
    const parsedData = parseTrainingData(extractedText);

    // 6. Training in der Datenbank speichern (falls OCR-Daten vorhanden)
    const {
      duration,
      calories,
      distance,
      floors,
      maxHeartRate,
      avgHeartRate,
      power,
    } = parsedData;
    if (!duration && !calories && !distance) {
      throw new Error("No valid training data extracted from the image.");
    }

    const userId = req.body.user_id || "648d75f5a95b5d2e9c3e8a1f"; // Platzhalter für Nutzer-ID

    const trainingSession = new TrainingSession({
      user_id: userId,
      date: trainingDate,
      duration: convertDurationToSeconds(duration), // Dauer in Sekunden
      calories_burned: calories || 0, // Kalorien
      distance: distance || 0, // Entfernung
      avg_speed: calculateAverageSpeed(distance, duration), // Durchschnittsgeschwindigkeit
      elevation: floors || 0, // Stockwerke
      heart_rate: {
        max: maxHeartRate || 0, // Maximale Herzfrequenz
        avg: avgHeartRate || 0, // Mittlere Herzfrequenz
      },
      power: power || 0, // Durchschnittsleistung
      device: determineDevice(parsedData), // Gerät bestimmen
    });

    await trainingSession.save();

    // 7. Erfolgreiche Antwort senden
    res.status(201).json({
      message: "Image processed and training saved successfully",
      trainingSession, // Die gespeicherte Trainingssession zurückgeben
    });
  } catch (error) {
    console.error("Error during image processing:", error.message);

    // Fehlerhandling: Temporäre Datei löschen
    if (req.file && req.file.path) {
      try {
        await fs.access(req.file.path); // Prüfen, ob die Datei existiert
        await fs.unlink(req.file.path); // Datei löschen
      } catch (err) {
        console.error(
          "Temporary file does not exist or could not be deleted:",
          err.message
        );
      }
    }
    res.status(500).json({ error: error.message });
  }
};

// Funktion zum Extrahieren der Trainingsdaten
function parseTrainingData(text) {
  const durationMatch = text.match(/(\d+:\d+)\s*Min:Sek/i); // Dauer der Übung
  const caloriesMatch = text.match(/(\d+)\s*kcal/i); // Verbrauchte Kalorien
  const distanceMatch = text.match(/([\d.]+)\s*km/i);
  const floorsMatch = text.match(/(\d+)\s*Stockwerke/i); // Stockwerke
  const maxHeartRateMatch = text.match(
    /Maximale Herzfrequenz\s*(\d+)\s*Schläge\/min/i
  ); // Maximale Herzfrequenz
  const avgHeartRateMatch = text.match(
    /Mittlere Herzfrequenz\s*(\d+)\s*Schläge\/min/i
  ); // Mittlere Herzfrequenz
  const powerMatch = text.match(/(\d+)\s*Watt/i); // Durchschnittsleistung

  return {
    duration: durationMatch ? durationMatch[1] : null, // z. B. "26:41"
    calories: caloriesMatch ? parseInt(caloriesMatch[1], 10) : null, // z. B. 300
    distance: distanceMatch ? parseFloat(distanceMatch[1]) : null, // z. B. 4.23 (falls vorhanden)
    floors: floorsMatch ? parseInt(floorsMatch[1], 10) : null, // z. B. 88
    maxHeartRate: maxHeartRateMatch ? parseInt(maxHeartRateMatch[1], 10) : null, // z. B. 152
    avgHeartRate: avgHeartRateMatch ? parseInt(avgHeartRateMatch[1], 10) : null, // z. B. 141
    power: powerMatch ? parseInt(powerMatch[1], 10) : null, // z. B. 117
  };
}

// Hilfsfunktionen
function convertDurationToSeconds(duration) {
  if (!duration) return 0;
  const [minutes, seconds] = duration.split(":").map(Number);
  return minutes * 60 + seconds;
}

function calculateAverageSpeed(distance, duration) {
  if (!distance || !duration || duration === 0) return 0;
  const hours = convertDurationToSeconds(duration) / 3600; // Dauer in Stunden
  return parseFloat((distance / hours).toFixed(2)); // Geschwindigkeit in km/h
}

function determineDevice(parsedData) {
  if (parsedData.floors) return "stepper";
  if (parsedData.power && !parsedData.floors) return "bike";
  return "treadmill";
}

function extractDateFromExif(exifData) {
  try {
    if (exifData && exifData.tags && exifData.tags.DateTimeOriginal) {
      return new Date(exifData.tags.DateTimeOriginal * 1000); // Unix-Timestamp zu JS-Date konvertieren
    }
    return null;
  } catch (error) {
    console.error("Error extracting date from EXIF metadata:", error);
    return null;
  }
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

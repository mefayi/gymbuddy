const mongoose = require("mongoose");

const trainingSessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: { type: Date, required: true },
  duration: { type: Number, required: true }, // in Sekunden
  calories_burned: { type: Number },
  distance: { type: Number }, // in km
  avg_speed: { type: Number }, // in km/h
  elevation: { type: Number }, // in Metern
  calories_per_hour: { type: Number },
  heart_rate: {
    max: { type: Number },
    avg: { type: Number },
  },
  device: {
    type: String,
    enum: ["treadmill", "bike", "stepper"],
    required: true,
  },
});

module.exports = mongoose.model("TrainingSession", trainingSessionSchema);

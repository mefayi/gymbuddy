const mongoose = require("mongoose");

const trainingSessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: { type: Date, required: true },
  duration: { type: Number, required: true },
  calories_burned: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  avg_speed: { type: Number, default: 0 },
  elevation: { type: Number, default: 0 },
  power: { type: Number, default: 0 },
  heart_rate: {
    max: { type: Number, default: 0 },
    avg: { type: Number, default: 0 },
  },
  device: {
    type: String,
    enum: ["treadmill", "bike", "stepper"],
    required: true,
  },
});

module.exports = mongoose.model("TrainingSession", trainingSessionSchema);

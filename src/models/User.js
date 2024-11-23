const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  date_of_birth: { type: Date, required: true },
  gender: { type: String, enum: ["male", "female", "other"], required: true },
  weight: { type: Number, required: true },
  height: { type: Number },
  created_at: { type: Date, default: Date.now },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  isAdmin: { type: Boolean, default: false },
});

// Passwort-Hashing vor dem Speichern
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("User", userSchema);

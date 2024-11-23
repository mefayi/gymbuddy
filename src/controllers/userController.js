const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const config = require("../config");

// Registrierung
exports.registerUser = async (req, res) => {
  const { email, password, date_of_birth, gender, weight, height } = req.body;

  try {
    const user = new User({
      email,
      password,
      date_of_birth,
      gender,
      weight,
      height,
    });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    const token = jwt.sign({ userId: user._id }, config.jwtSecret, {
      expiresIn: "7d",
    });
    res.status(200).json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  const { userId, weight, height } = req.body;

  try {
    const updates = {};
    if (weight) updates.weight = weight;
    if (height) updates.height = height;

    if (weight && (weight <= 0 || weight > 500)) {
      throw new Error("Invalid weight value");
    }
    if (height && (height <= 50 || height > 300)) {
      throw new Error("Invalid height value");
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    });
    if (!updatedUser) throw new Error("User not found");

    res
      .status(200)
      .json({ message: "Profile updated successfully", updatedUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new Error("Incorrect old password");

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const crypto = require("crypto");

// Passwort-Reset anfordern
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found");

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000;
    await user.save();

    res.status(200).json({ message: "Password reset link sent", resetToken });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Passwort zurücksetzen
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) throw new Error("Invalid or expired token");

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Alle Nutzer abrufen
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Nutzer löschen
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new Error("User not found");
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Nutzer bearbeiten (Admin)
exports.updateUserByAdmin = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
    });
    if (!updatedUser) throw new Error("User not found");
    res.status(200).json({ message: "User updated successfully", updatedUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Größe aktualisieren
exports.updateHeight = async (req, res) => {
  const { userId, height } = req.body;

  try {
    if (!height || height <= 0) throw new Error("Invalid height value");

    const user = await User.findByIdAndUpdate(
      userId,
      { height },
      { new: true }
    );
    if (!user) throw new Error("User not found");

    res.status(200).json({ message: "Height updated successfully", user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  updateUserProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getAllUsers,
  deleteUser,
  updateUserByAdmin,
  updateHeight,
} = require("../controllers/userController");

// Routen für Nutzeraktionen
router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/update-profile", updateUserProfile);
router.put("/change-password", changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Admin-Routen
router.get("/admin/users", getAllUsers);
router.delete("/admin/users/:id", deleteUser);
router.put("/admin/users/:id", updateUserByAdmin);

// Größe aktualisieren
router.put("/update-height", updateHeight);

module.exports = router;

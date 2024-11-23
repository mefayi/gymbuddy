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
router.put("/update-height", updateHeight);
router.put("/change-password", changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Admin-Routen
router.get("/admin/users", getAllUsers);
router.put("/admin/users/:id", updateUserByAdmin);
router.delete("/admin/users/:id", deleteUser);

module.exports = router;

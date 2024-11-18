const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../controllers/userController");

// User-Routen
router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/update-height", updateHeight);
router.put("/update-profile", updateUserProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/change-password", changePassword);
router.get("/admin/users", isAdmin, getAllUsers);
router.delete("/admin/users/:id", isAdmin, deleteUser);
router.put("/admin/users/:id", isAdmin, updateUserByAdmin);

module.exports = router;

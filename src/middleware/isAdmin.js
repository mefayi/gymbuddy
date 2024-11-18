const User = require("../models/User");

const isAdmin = async (req, res, next) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== "admin") throw new Error("Access denied");
    next();
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

module.exports = isAdmin;

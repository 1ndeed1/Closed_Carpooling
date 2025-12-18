const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  const domain = email.split("@")[1];
  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashed,
    role,
    organization: domain,
    isAdmin: false
  });

  res.json({ message: "Registered" });
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign(
    { id: user._id, role: user.role, org: user.organization },
    process.env.JWT_SECRET
  );

  res.json({
    token,
    role: user.role,
    isAdmin: user.isAdmin
  });
});

module.exports = router;

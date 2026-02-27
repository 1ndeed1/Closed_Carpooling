const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const validate = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../middleware/validators");

// REGISTER
router.post("/register", validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      organization: null,
      orgStatus: "none"
    });

    res.json({ message: "Registered successfully" });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        organization: user.organization,
        orgStatus: user.orgStatus,
        isAdmin: user.isAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

const auth = require("../middleware/auth");

// GET CURRENT USER
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").populate("organization");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// UPDATE PROFILE
router.patch("/me", auth, async (req, res) => {
  try {
    const { name, role } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (role) user.role = role;
    if (req.body.homeLocation) user.homeLocation = req.body.homeLocation;
    if (req.body.workLocation) user.workLocation = req.body.workLocation;

    await user.save();
    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

module.exports = router;

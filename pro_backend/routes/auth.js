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
    console.log(`Updating profile for user ${req.user.id}:`, req.body);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (req.body.phoneNumber !== undefined) user.phoneNumber = req.body.phoneNumber;
    if (req.body.employeeId !== undefined) user.employeeId = req.body.employeeId;
    if (req.body.homeLocation !== undefined) user.homeLocation = req.body.homeLocation;
    if (req.body.workLocation !== undefined) user.workLocation = req.body.workLocation;
    if (req.body.vehicleInfo !== undefined) user.vehicleInfo = req.body.vehicleInfo;

    await user.save();
    console.log("Profile updated successfully");
    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// GOOGLE LOGIN
router.post("/google-login", async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({
      $or: [{ googleId: sub }, { email: email }]
    });

    if (!user) {
      // Create new user
      user = await User.create({
        name,
        email,
        googleId: sub,
        role: "passenger", // Default role
        orgStatus: "none"
      });
    } else if (!user.googleId) {
      // Link Google ID if user existed by email
      user.googleId = sub;
      await user.save();
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

    res.json({ token, user });
  } catch (err) {
    console.error("GOOGLE LOGIN ERROR:", err);
    res.status(400).json({ message: "Google login failed" });
  }
});

module.exports = router;

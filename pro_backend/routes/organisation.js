const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Organization = require("../models/Organization");
const User = require("../models/User");
const { sendOtpEmail } = require("../utils/emailService");

// User requests to join an organization (Sends OTP)
router.post("/:orgId/request", auth, async (req, res) => {
  try {
    if (req.params.orgId === "null" || req.params.orgId === "undefined" || !req.params.orgId) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: "Org not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (org.members.some(id => id.toString() === user._id.toString())) {
      return res.status(400).json({ message: "Already a member" });
    }

    // 🛡️ STRICT PROFILE CHECK
    if (!user.phoneNumber || !user.employeeId) {
      return res.status(400).json({ message: "Please complete your profile (Phone & Employee ID) before joining." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user.otp = otp;
    user.otpExpires = otpExpires;
    user.organization = org._id; // Pre-set the org, but keep status pending
    user.orgStatus = "pending";
    await user.save();

    // Send OTP
    await sendOtpEmail(user.email, otp);

    res.json({ message: "Verification OTP sent to your email" });
  } catch (err) {
    console.error("JOIN REQUEST ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// VERIFY OTP
router.post("/:orgId/verify-otp", auth, async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !user.otp || user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    // Join organization - MOVE TO 'verified' status instead of 'approved'
    // This allows admin to see the request after OTP verification
    if (!org.pendingRequests.includes(user._id)) {
      org.pendingRequests.push(user._id);
      await org.save();
    }

    user.orgStatus = "verified";
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: "Organization verified successfully!", user });
  } catch (err) {
    console.error("OTP VERIFY ERROR:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

router.get("/:orgId/requests", auth, async (req, res) => {
  if (!req.params.orgId || req.params.orgId === "null" || req.params.orgId === "undefined") {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  const org = await Organization.findById(req.params.orgId)
    .populate("pendingRequests", "name email phoneNumber employeeId");

  if (!org) {
    return res.status(404).json({ message: "Organization not found" });
  }

  // 🔒 Only admin can view requests
  if (org.admin.toString() !== req.user.id) {
    return res.status(403).json({ message: "Admin access required" });
  }

  res.json(org.pendingRequests);
});


// APPROVE USER (ADMIN ONLY - fallback if OTP fails or for manual overrides)
router.post("/:orgId/approve/:userId", auth, async (req, res) => {
  if (!req.params.orgId || req.params.orgId === "null" || req.params.orgId === "undefined") {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  const org = await Organization.findById(req.params.orgId);
  const user = await User.findById(req.params.userId);

  if (!org || !user) {
    return res.status(404).json({ message: "Org or user not found" });
  }

  // 🔒 Only admin can approve
  if (org.admin.toString() !== req.user.id) {
    return res.status(403).json({ message: "Admin access required" });
  }

  // Remove from pending
  org.pendingRequests = org.pendingRequests.filter(
    id => id.toString() !== user._id.toString()
  );

  // Add to members
  if (!org.members.includes(user._id)) {
    org.members.push(user._id);
  }

  await org.save();

  // Update user
  user.organization = org._id;
  user.orgStatus = "approved";
  await user.save();

  res.json({ message: "User approved successfully" });
});

// GET ALL ORGANIZATIONS (for join page)
router.get("/", auth, async (req, res) => {
  try {
    const orgs = await Organization.find().select("name domain");
    res.json(orgs);
  } catch (err) {
    console.error("FETCH ORGANIZATIONS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch organizations" });
  }
});

module.exports = router;


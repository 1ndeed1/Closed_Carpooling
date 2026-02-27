const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Organization = require("../models/Organization");
const User = require("../models/User");

// User requests to join an organization
router.post("/:orgId/request", auth, async (req, res) => {
  if (req.params.orgId === "null" || req.params.orgId === "undefined" || !req.params.orgId) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  const org = await Organization.findById(req.params.orgId);
  if (!org) return res.status(404).json({ message: "Org not found" });

  if (org.members.some(id => id.toString() === req.user.id)) {
    return res.status(400).json({ message: "Already a member" });
  }

  if (org.pendingRequests.some(id => id.toString() === req.user.id)) {
    return res.status(400).json({ message: "Request already sent" });
  }

  org.pendingRequests.push(req.user.id);
  await org.save();

  await User.findByIdAndUpdate(req.user.id, {
    organization: org._id,
    orgStatus: "pending"
  });

  res.json({ message: "Request sent to organization admin" });
});

router.get("/:orgId/requests", auth, async (req, res) => {
  if (!req.params.orgId || req.params.orgId === "null" || req.params.orgId === "undefined") {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  const org = await Organization.findById(req.params.orgId)
    .populate("pendingRequests", "name email");

  if (!org) {
    return res.status(404).json({ message: "Organization not found" });
  }

  // 🔒 Only admin can view requests
  if (org.admin.toString() !== req.user.id) {
    return res.status(403).json({ message: "Admin access required" });
  }

  res.json(org.pendingRequests);
});


// APPROVE USER (ADMIN ONLY)
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
  org.members.push(user._id);

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
    console.log("FETCHING ORGANIZATIONS FOR USER:", req.user.id);
    const orgs = await Organization.find().select("name domain");
    console.log(`FOUND ${orgs.length} ORGANIZATIONS`);
    res.json(orgs);
  } catch (err) {
    console.error("FETCH ORGANIZATIONS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch organizations" });
  }
});

module.exports = router;


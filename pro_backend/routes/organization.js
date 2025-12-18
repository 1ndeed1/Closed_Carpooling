const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Organization = require("../models/Organization");
const User = require("../models/User");

// User requests to join an organization
router.post("/:orgId/request", auth, async (req, res) => {
  const org = await Organization.findById(req.params.orgId);
  if (!org) return res.status(404).json({ message: "Org not found" });

  if (org.members.includes(req.user.id)) {
    return res.status(400).json({ message: "Already a member" });
  }

  org.pendingRequests.push(req.user.id);
  await org.save();

  await User.findByIdAndUpdate(req.user.id, {
    organization: org._id,
    orgStatus: "pending"
  });

  res.json({ message: "Request sent to organization admin" });
});

module.exports = router;


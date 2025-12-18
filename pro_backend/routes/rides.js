const express = require("express");
const Ride = require("../models/Ride");
const auth = require("../middleware/auth");
const router = express.Router();


// CREATE RIDE
router.post("/", auth, async (req, res) => {
  const user = req.user;

  // 🚫 Block unapproved org users
  if (user.organization && user.orgStatus !== "approved") {
    return res.status(403).json({
      message: "Organization approval required to create company rides"
    });
  }

  const ride = new Ride({
    driver: user.id,
    start: req.body.start,
    end: req.body.end,
    time: req.body.time,
    seats: req.body.seats,
    organization: user.orgStatus === "approved" ? user.organization : null
  });

  await ride.save();
  res.json({ message: "Ride created", ride });
});


// SEARCH RIDES
router.get("/search", auth, async (req, res) => {
  const user = req.user;

  let query = { seats: { $gt: 0 } };

  // Approved org users → org rides only
  if (user.organization && user.orgStatus === "approved") {
    query.organization = user.organization;
  }

  // Pending org users → see nothing
  if (user.organization && user.orgStatus === "pending") {
    return res.json([]);
  }

  const rides = await Ride.find(query).populate("driver", "name email");
  res.json(rides);
});


// REQUEST RIDE
router.post("/:id/request", auth, async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  // 🚫 Ride not found
  if (!ride) {
    return res.status(404).json({ message: "Ride not found" });
  }

  // 🚫 Block pending org users from org rides
  if (ride.organization && req.user.orgStatus !== "approved") {
    return res.status(403).json({
      message: "Organization approval required to join this ride"
    });
  }

  if (ride.seats <= 0) {
    return res.status(400).json({ message: "No seats left" });
  }

  // 🔒 Prevent duplicate join
  if (ride.passengers.includes(req.user.id)) {
    return res.status(400).json({ message: "Already joined this ride" });
  }

  ride.passengers.push(req.user.id);
  ride.seats -= 1;

  await ride.save();
  res.json({ message: "Joined ride successfully" });
});

module.exports = router;

const express = require("express");
const Ride = require("../models/Ride");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/summary", auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Only calculate metrics for the user's specific organization
    let query = {};
    if (user.organization && user.orgStatus === "approved") {
      query.organization = user.organization;
    } else if (user.orgStatus !== "approved") {
      // If user has no access, return zeros instead of global data
      return res.json({ totalRides: 0, totalPassengers: 0, estimatedCO2SavedKg: 0 });
    }

    const rides = await Ride.find(query);
    console.log("ORG RIDES FOUND:", rides.length);

    let totalRides = rides.length;
    let totalPassengers = 0;
    let totalCO2Saved = 0;

    const CO2_PER_KM = 0.12;
    // We can use the actual computed `distanceKm` from the ride if it exists, otherwise fallback to AVG_DISTANCE
    const AVG_DISTANCE = 10;

    rides.forEach((ride) => {
      const passengersCount = ride.passengers?.length || 0;
      const rideDistance = ride.distanceKm || AVG_DISTANCE;

      totalPassengers += passengersCount;
      totalCO2Saved += passengersCount * rideDistance * CO2_PER_KM;
    });

    res.json({
      totalRides,
      totalPassengers,
      estimatedCO2SavedKg: Number(totalCO2Saved.toFixed(2)),
    });
  } catch (err) {
    console.error("❌ METRICS ERROR:", err);
    res.status(500).json({ message: "Metrics failed" });
  }
});

module.exports = router;

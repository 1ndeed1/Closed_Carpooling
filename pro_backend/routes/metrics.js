const express = require("express");
const Ride = require("../models/Ride");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/summary", auth, async (req, res) => {
  try {
    const rides = await Ride.find();
    console.log("RIDES:", rides);

    let totalRides = rides.length;
    let totalPassengers = 0;
    let totalCO2Saved = 0;

    const CO2_PER_KM = 0.12;
    const AVG_DISTANCE = 10;

    rides.forEach((ride) => {
      console.log("RIDE:", ride);
      console.log("PASSENGERS:", ride.passengers);

      const passengersCount = ride.passengers?.length || 0;

      totalPassengers += passengersCount;
      totalCO2Saved += passengersCount * AVG_DISTANCE * CO2_PER_KM;
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

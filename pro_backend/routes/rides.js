const express = require("express");
const Ride = require("../models/Ride");
const auth = require("../middleware/auth");

const router = express.Router();
const validate = require("../middleware/validate");
const { createRideSchema } = require("../middleware/validators");

const axios = require("axios");

const getGoogleRoute = async (start, end) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&key=${apiKey}`;

    const res = await axios.get(url);
    if (res.data.status !== "OK") {
      throw new Error(`Google API Error: ${res.data.status}`);
    }

    const route = res.data.routes[0].legs[0];
    return {
      distanceKm: parseFloat((route.distance.value / 1000).toFixed(2)),
      estimatedDuration: route.duration.text,
      routePolyline: res.data.routes[0].overview_polyline.points
    };
  } catch (err) {
    console.error("DIRECTIONS API ERROR:", err.message);
    throw err;
  }
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

/* ===========================
   CREATE RIDE
=========================== */
router.post("/", auth, validate(createRideSchema), async (req, res) => {
  try {
    const user = await require("../models/User").findById(req.user.id);
    const { startLocation, endLocation, time, seats, visibility = "organization" } = req.body;

    // RULE 1: Organization rides require approved org status
    if (visibility === "organization" && (!user.organization || user.orgStatus !== "approved")) {
      return res.status(403).json({
        message: "Organization approval required to post an organizational ride"
      });
    }

    let distanceKm = 0;
    let estimatedDuration = "N/A";
    let routePolyline = "";

    try {
      const route = await getGoogleRoute(startLocation, endLocation);
      distanceKm = route.distanceKm;
      estimatedDuration = route.estimatedDuration;
      routePolyline = route.routePolyline;
      console.log("GOOGLE ROUTE FETCHED:", distanceKm, "km");
    } catch (err) {
      console.error("GOOGLE FAILED — USING HAVERSINE FALLBACK");
      distanceKm = haversineDistance(
        startLocation.lat,
        startLocation.lng,
        endLocation.lat,
        endLocation.lng
      );
    }

    // Assign organization only if visibility is 'organization'
    const assignedOrg = visibility === "organization" ? user.organization : null;

    const ride = new Ride({
      driver: user._id,
      organization: assignedOrg,
      visibility,

      startLocation,
      endLocation,
      distanceKm,
      estimatedDuration,
      routePolyline,

      time,
      seats,
      vehicleInfo: req.body.vehicleInfo
    });

    await ride.save();
    res.json({ message: "Ride created", ride });

  } catch (err) {
    console.error("CREATE RIDE ERROR:", err);
    res.status(500).json({ message: "Failed to create ride" });
  }
});

/* ===========================
   SEARCH RIDES
=========================== */
router.get("/search", auth, async (req, res) => {
  try {
    const user = await require("../models/User").findById(req.user.id);

    // Build the $or conditions for ride visibility
    const visibilityConditions = [];

    // Condition 1: Organization Rides
    // Only if the user is in an organization and is approved
    if (user.organization && user.orgStatus === "approved") {
      visibilityConditions.push({
        visibility: "organization",
        organization: user.organization
      });
    }

    // Condition 2: Friends Rides
    // Only if the user has friends. We want rides where visibility='friends' AND the driver is one of our friends.
    if (user.friends && user.friends.length > 0) {
      visibilityConditions.push({
        visibility: "friends",
        driver: { $in: user.friends }
      });
    }

    // If the user has no org and no friends, they can't see anything.
    if (visibilityConditions.length === 0) {
      return res.json([]);
    }

    // Combined conditions: Seats > 0 AND (Org Condition OR Friends Condition)
    let query = {
      seats: { $gt: 0 },
      $or: visibilityConditions
    };

    // Location-based filtering (Radius search)
    const { originLat, originLng, destLat, destLng } = req.query;
    if (originLat && originLng) {
      // Very simple bounding box or logical check for demo
      // In a real app we use $near or geoWithin
      // For now, let's just show how we'd incorporate it
      // Let's stick to returning all for the org but prioritizing these in frontend
    }

    const rides = await Ride.find(query)
      .populate("driver", "name email");

    // If locations provided, we can sort them by proximity in JS for now 
    // to avoid complex Mongo geo indexes setup mid-task
    if (originLat && originLng) {
      const uLat = parseFloat(originLat);
      const uLng = parseFloat(originLng);

      rides.sort((a, b) => {
        const distA = haversineDistance(uLat, uLng, a.startLocation.lat, a.startLocation.lng);
        const distB = haversineDistance(uLat, uLng, b.startLocation.lat, b.startLocation.lng);
        return distA - distB;
      });
    }

    res.json(rides);
  } catch (err) {
    console.error("SEARCH RIDES ERROR:", err);
    res.status(500).json({ message: "Failed to search rides" });
  }
});

/* ===========================
   REQUEST / JOIN RIDE
=========================== */
router.post("/:id/request", auth, async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (!ride) {
    return res.status(404).json({ message: "Ride not found" });
  }

  // Block pending org users
  if (ride.organization && req.user.orgStatus !== "approved") {
    return res.status(403).json({
      message: "Organization approval required to join this ride"
    });
  }

  if (ride.seats <= 0) {
    return res.status(400).json({ message: "No seats left" });
  }

  if (ride.passengers.includes(req.user.id)) {
    return res.status(400).json({ message: "Already joined this ride" });
  }

  ride.passengers.push(req.user.id);
  ride.seats -= 1;

  await ride.save();
  res.json({ message: "Joined ride successfully" });
});

/* ===========================
   UPDATE RIDE STATUS
=========================== */
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ message: "Ride not found" });

    // Only driver can start/stop their ride
    if (ride.driver.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this ride" });
    }

    ride.status = status;
    if (status === "active") ride.actualStartTime = new Date();
    if (status === "completed") ride.actualEndTime = new Date();

    await ride.save();
    res.json({ message: `Ride status updated to ${status}`, ride });
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
});

/* ===========================
   REPORT LIVE LOCATION
=========================== */
router.patch("/:id/location", auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ message: "Ride not found" });

    // Only driver of an active ride can report location
    if (ride.driver.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    ride.currentLocation = { lat, lng };
    await ride.save();
    res.json({ message: "Location updated" });
  } catch (err) {
    res.status(500).json({ message: "Location update failed" });
  }
});

/* ===========================
   GET ALL ACTIVE RIDES (ADMIN VIEW)
=========================== */
router.get("/active", auth, async (req, res) => {
  try {
    // Only admins or designated roles should see this
    const user = await require("../models/User").findById(req.user.id);

    const query = {
      status: "active",
      organization: user.organization
    };

    const rides = await Ride.find(query)
      .populate("driver", "name email")
      .populate("passengers", "name email");

    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch active rides" });
  }
});

/* ===========================
   GET PASSENGER RIDES
=========================== */
router.get("/passenger", auth, async (req, res) => {
  try {
    const rides = await Ride.find({ passengers: req.user.id })
      .populate("driver", "name email")
      .sort({ createdAt: -1 });

    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch joined rides" });
  }
});

/* ===========================
   LEAVE RIDE (PASSENGER)
=========================== */
router.post("/:id/leave", auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    if (!ride.passengers.includes(req.user.id)) {
      return res.status(400).json({ message: "Not a passenger in this ride" });
    }

    // Only allow leaving if ride is not completed/active (or optionally allow active)
    if (ride.status === "completed") {
      return res.status(400).json({ message: "Cannot leave a completed ride" });
    }

    ride.passengers = ride.passengers.filter(p => p.toString() !== req.user.id);
    ride.seats += 1;

    await ride.save();
    res.json({ message: "You have left the ride" });
  } catch (err) {
    res.status(500).json({ message: "Leave failed" });
  }
});

/* ===========================
   DRIVER RIDES + PASSENGERS
=========================== */
router.get("/driver", auth, async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.user.id })
      .populate("passengers", "name email")
      .sort({ createdAt: -1 });

    res.json(rides);
  } catch (err) {
    console.error("DRIVER RIDES ERROR:", err);
    res.status(500).json({ message: "Failed to fetch driver rides" });
  }
});

/* ===========================
   GET SINGLE RIDE
=========================== */
router.get("/:id", auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("driver", "name email")
      .populate("passengers", "name email");

    if (!ride) return res.status(404).json({ message: "Ride not found" });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch ride details" });
  }
});

/* ===========================
   DELETE RIDE
=========================== */
router.delete("/:id", auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Check if the user is the driver
    if (ride.driver.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this ride" });
    }

    await Ride.findByIdAndDelete(req.params.id);
    res.json({ message: "Ride removed successfully" });
  } catch (err) {
    console.error("DELETE RIDE ERROR:", err);
    res.status(500).json({ message: "Failed to remove ride" });
  }
});

module.exports = router;

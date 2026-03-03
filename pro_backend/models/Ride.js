const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  address: String
}, { _id: false });

const RideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    default: null
  },

  // OLD (keep for compatibility, optional later)
  start: String,
  end: String,

  // NEW (maps-based)
  startLocation: LocationSchema,
  endLocation: LocationSchema,

  distanceKm: Number,      // computed once
  estimatedDuration: String, // from Google Directions
  routePolyline: String,     // encoded polyline for maps

  time: String,
  seats: Number,

  passengers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  visibility: {
    type: String,
    enum: ["organization", "friends"],
    default: "organization"
  },

  status: {
    type: String,
    enum: ["scheduled", "active", "completed", "cancelled"],
    default: "scheduled"
  },

  currentLocation: {
    lat: Number,
    lng: Number
  },

  actualStartTime: Date,
  actualEndTime: Date,

  vehicleInfo: {
    model: String,
    color: String,
    plateNumber: String
  }

}, { timestamps: true });

module.exports = mongoose.model("Ride", RideSchema);

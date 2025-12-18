const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  organization: String,
  start: String,
  end: String,
  time: String,
  seats: Number,
  passengers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

module.exports = mongoose.model("Ride", RideSchema);

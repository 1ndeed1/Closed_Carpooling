const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["driver", "passenger"] },

  // 🔹 Organization-related
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    default: null
  },
  orgStatus: {
    type: String,
    enum: ["none", "pending", "approved"],
    default: "none"
  },

  // 🔹 Friend system
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  friendRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  // 🔹 Admin
  isAdmin: { type: Boolean, default: false },

  // 🔹 Favorite Places
  homeLocation: {
    lat: Number,
    lng: Number,
    address: String
  },
  workLocation: {
    lat: Number,
    lng: Number,
    address: String
  }

}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);

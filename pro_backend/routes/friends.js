const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");


// SEND FRIEND REQUEST
router.post("/request/:userId", auth, async (req, res) => {
  const sender = await User.findById(req.user.id);
  const receiver = await User.findById(req.params.userId);

  if (!receiver) {
    return res.status(404).json({ message: "User not found" });
  }

  if (sender.friends.includes(receiver._id)) {
    return res.status(400).json({ message: "Already friends" });
  }

  if (receiver.friendRequests.includes(sender._id)) {
    return res.status(400).json({ message: "Request already sent" });
  }

  receiver.friendRequests.push(sender._id);
  await receiver.save();

  res.json({ message: "Friend request sent" });
});


// ACCEPT FRIEND REQUEST
router.post("/accept/:userId", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  const sender = await User.findById(req.params.userId);

  if (!sender) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!user.friendRequests.includes(sender._id)) {
    return res.status(400).json({ message: "No friend request from this user" });
  }

  // Add each other as friends
  user.friends.push(sender._id);
  sender.friends.push(user._id);

  // Remove request
  user.friendRequests = user.friendRequests.filter(
    id => id.toString() !== sender._id.toString()
  );

  await user.save();
  await sender.save();

  res.json({ message: "Friend request accepted" });
});


// GET FRIEND LIST
router.get("/", auth, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friends", "name email");

  res.json(user.friends);
});


// GET FRIEND REQUESTS
router.get("/requests", auth, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friendRequests", "name email");

  res.json(user.friendRequests);
});

module.exports = router;

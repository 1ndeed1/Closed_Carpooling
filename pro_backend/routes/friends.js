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


// GET ALL USERS FOR DISCOVERY
router.get("/users", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    // Find all users EXCEPT the current user
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select("name email role organization")
      .populate("organization", "name");

    // Add connection status
    const usersWithStatus = users.map(u => {
      let status = "none";
      if (currentUser.friends.includes(u._id)) {
        status = "friends";
      } else if (currentUser.friendRequests.includes(u._id)) {
        status = "request_received";
      } else if (u.friendRequests && u.friendRequests.includes(currentUser._id)) {
        status = "request_sent"; // Requires looking at the other user's array, but we can do it efficiently
      }

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        organization: u.organization,
        status
      };
    });

    res.json(usersWithStatus);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
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

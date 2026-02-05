const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

console.log("USING MONGO URI:", process.env.MONGO_URI);

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/rides", require("./routes/rides"));
    app.use("/api/org", require("./routes/organization"));
    app.use("/api/friends", require("./routes/friends"));
    app.use("/api/metrics", require("./routes/metrics"));

    app.post("/test", (req, res) => 
      {
        res.send("TEST OK");
      });


    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

startServer();

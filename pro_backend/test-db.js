const mongoose = require("mongoose");
require("dotenv").config();

async function testConnection() {
    try {
        console.log("Connecting to:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connection Successful!");
        process.exit(0);
    } catch (err) {
        console.error("❌ MongoDB Connection Failed:", err.message);
        process.exit(1);
    }
}

testConnection();

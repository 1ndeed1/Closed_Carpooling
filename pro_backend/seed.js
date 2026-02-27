const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Organization = require("./models/Organization");
require("dotenv").config();

async function seed() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGO_URI);

        // Clear existing data (optional, but clean)
        await User.deleteMany({});
        await Organization.deleteMany({});

        console.log("Creating Admin User...");
        const hashedAdminPassword = await bcrypt.hash("password123", 10);
        const admin = await User.create({
            name: "Alice Admin",
            email: "admin@test.com",
            password: hashedAdminPassword,
            role: "driver",
            isAdmin: true,
            orgStatus: "approved"
        });

        console.log("Creating Organization...");
        const org = await Organization.create({
            name: "Global Tech",
            domain: "test.com",
            admin: admin._id,
            members: [admin._id]
        });

        // Link admin to org
        admin.organization = org._id;
        await admin.save();

        console.log("Creating Test Passenger...");
        const hashedPassPassword = await bcrypt.hash("bob123", 10);
        await User.create({
            name: "Bob Passenger",
            email: "bob@test.com",
            password: hashedPassPassword,
            role: "passenger",
            orgStatus: "none"
        });

        console.log("✅ SEEDING COMPLETE!");
        console.log("-------------------");
        console.log("Admin Email: admin@test.com");
        console.log("User Email: bob@test.com");
        console.log("Admin Password: password123");
        console.log("Bob Password: bob123");
        console.log("Organization: Global Tech");
        console.log("-------------------");

        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding Failed:", err);
        process.exit(1);
    }
}

seed();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Organization = require("./models/Organization");
const Ride = require("./models/Ride");
require("dotenv").config();

async function seedDB() {
    try {
        console.log("--- 🏁 Starting Fresh Start Seeding ---");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Clear Collections
        console.log("🧹 Clearing collections...");
        await User.deleteMany({});
        await Organization.deleteMany({});
        await Ride.deleteMany({});
        console.log("✅ Collections cleared");

        // 2. Create Organizations
        console.log("🏢 Seeding Organizations...");
        const orgs = await Organization.insertMany([
            { name: "Global Tech", domain: "globaltech.com" },
            { name: "City University", domain: "cityuni.edu" },
            { name: "Nexus Corp", domain: "nexus.io" }
        ]);
        console.log(`✅ ${orgs.length} organizations created`);

        // 3. Create Super Admin
        console.log("👤 Creating Super Admin...");
        const hashedAdminPassword = await bcrypt.hash("admin123", 10);
        const admin = await User.create({
            name: "System Admin",
            email: "admin@test.com",
            password: hashedAdminPassword,
            role: "driver",
            isAdmin: true,
            phoneNumber: "9876543210",
            employeeId: "ADM-001",
            orgStatus: "approved",
            organization: orgs[0]._id
        });

        // Add admin to org members
        orgs[0].admin = admin._id;
        orgs[0].members.push(admin._id);
        await orgs[0].save();

        console.log("✅ Super Admin created: admin@test.com / admin123");

        console.log("\n🚀 FRESH START COMPLETE!");
    } catch (err) {
        console.error("❌ Seeding Failed:", err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

seedDB();

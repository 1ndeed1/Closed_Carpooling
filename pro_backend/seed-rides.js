const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Organization = require("./models/Organization");
const Ride = require("./models/Ride");
require("dotenv").config();

async function seedRides() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGO_URI);

        console.log("Cleaning up existing rides and users (except main admin/org if exists)...");
        // We'll keep the admin and org from the original seed.js if they exist, or recreate them.
        await Ride.deleteMany({});

        let org = await Organization.findOne({ domain: "test.com" });
        let admin = await User.findOne({ email: "admin@test.com" });

        if (!admin || !org) {
            console.log("Admin or Org not found. Please run `node seed.js` first.");
            process.exit(1);
        }

        // ====== 1. Create Pending Users (for Requests tab) ======
        console.log("Creating pending users for org approval...");
        await User.deleteMany({ email: { $nin: ["admin@test.com", "bob@test.com"] } });

        const hashedPass = await bcrypt.hash("password123", 10);

        const pendingUser1 = await User.create({
            name: "Charlie Pending",
            email: "charlie@test.com",
            password: hashedPass,
            role: "passenger",
            orgStatus: "pending",
            organization: org._id
        });

        const pendingUser2 = await User.create({
            name: "Diana Waitlist",
            email: "diana@test.com",
            password: hashedPass,
            role: "driver",
            orgStatus: "pending",
            organization: org._id
        });

        // 🚀 CRITICAL FIX: Add to Organization's pendingRequests array
        org.pendingRequests.push(pendingUser1._id, pendingUser2._id);
        await org.save();

        // ====== 2. Create Approved Users (Passengers/Drivers) ======
        console.log("Creating approved users...");
        const driverUser1 = await User.create({
            name: "Eve Driver",
            email: "eve@test.com",
            password: hashedPass,
            role: "driver",
            orgStatus: "approved",
            organization: org._id
        });

        const passenger1 = await User.create({
            name: "Frank Passenger",
            email: "frank@test.com",
            password: hashedPass,
            role: "passenger",
            orgStatus: "approved",
            organization: org._id
        });

        const passenger2 = await User.create({
            name: "Grace Commuter",
            email: "grace@test.com",
            password: hashedPass,
            role: "passenger",
            orgStatus: "approved",
            organization: org._id
        });

        // Add them to org members
        org.members.push(driverUser1._id, passenger1._id, passenger2._id);
        await org.save();


        // ====== 3. Create Rides ======
        console.log("Creating simulated rides...");

        // Sample Polyline (Bangalore Center)
        const samplePolyline = "_p~iFvxzfM_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S_@S";

        // A. Active Ride 1 (Visible on Map)
        await Ride.create({
            driver: admin._id,
            organization: org._id,
            startLocation: { lat: 12.9716, lng: 77.5946, address: "Bangalore MG Road" }, // Bangalore Center
            endLocation: { lat: 12.9352, lng: 77.6245, address: "Koramangala" },
            currentLocation: { lat: 12.9534, lng: 77.6095 }, // Somewhere in between
            distanceKm: 8.5,
            passengers: [passenger1._id],
            status: "active",
            time: new Date().toISOString(),
            routePolyline: samplePolyline
        });

        // B. Active Ride 2 (Visible on Map)
        await Ride.create({
            driver: driverUser1._id,
            organization: org._id,
            startLocation: { lat: 13.0358, lng: 77.5970, address: "Hebbal" },
            endLocation: { lat: 12.9716, lng: 77.5946, address: "MG Road" },
            currentLocation: { lat: 13.0034, lng: 77.5960 },
            distanceKm: 12.2,
            passengers: [passenger2._id],
            status: "active",
            time: new Date().toISOString(),
            routePolyline: samplePolyline
        });

        // C. Completed Ride (For Metrics - CO2, Total Rides, Total Passengers)
        await Ride.create({
            driver: admin._id,
            organization: org._id,
            startLocation: { lat: 12.9279, lng: 77.6271, address: "BTM Layout" },
            endLocation: { lat: 12.8399, lng: 77.6770, address: "Electronic City" },
            distanceKm: 15.0,
            passengers: [passenger1._id, passenger2._id],
            status: "completed",
            time: new Date(Date.now() - 86400000).toISOString() // Yesterday
        });

        // D. Scheduled Ride
        await Ride.create({
            driver: driverUser1._id,
            organization: org._id,
            startLocation: { lat: 12.9716, lng: 77.5946, address: "MG Road" },
            endLocation: { lat: 12.9279, lng: 77.6271, address: "BTM Layout" },
            distanceKm: 7.5,
            passengers: [],
            status: "scheduled",
            time: new Date(Date.now() + 86400000).toISOString() // Tomorrow
        });

        console.log("✅ SEEDING SCHEDULED & ACTIVE RIDES COMPLETE!");
        console.log("-------------------");
        console.log("Log in as Admin (admin@test.com / password123) to view the Admin Dashboard");
        console.log("You should see:");
        console.log("- 2 Active Rides on the Live Map");
        console.log("- 4 Total Trips in KPIs");
        console.log("- Pending requests from Charlie and Diana");
        console.log("-------------------");

        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding Failed:", err);
        process.exit(1);
    }
}

seedRides();

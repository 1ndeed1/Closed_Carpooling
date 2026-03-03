const axios = require("axios");
const mongoose = require("mongoose");
const User = require("./models/User");
const Organization = require("./models/Organization");
require("dotenv").config();

const API_URL = "http://localhost:5000/api";

async function testOtpFlow() {
    try {
        console.log("--- 🧪 Starting OTP Flow Test ---");

        // 1. Connect to DB to check OTP
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // 2. Register a NEW random user to ensure clean state
        const randomId = Math.floor(Math.random() * 10000);
        const testUser = {
            name: `Test User ${randomId}`,
            email: `testuser${randomId}@example.com`,
            password: "password123",
            role: "passenger"
        };

        console.log(`\n1. Registering unique user: ${testUser.email}`);
        await axios.post(`${API_URL}/auth/register`, testUser);

        console.log("2. Logging in...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        const token = loginRes.data.token;
        console.log("✅ Logged in");

        // 3. Find an organization
        const orgsRes = await axios.get(`${API_URL}/organisation`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const org = orgsRes.data[0];
        if (!org) throw new Error("No organizations found to join");
        console.log(`\n3. Requesting to join: ${org.name}`);

        // 4. Request Join (Sends OTP)
        const requestRes = await axios.post(`${API_URL}/organisation/${org._id}/request`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Request sent: ${requestRes.data.message}`);

        // 5. Fetch OTP from DB (Simulating reading email)
        const user = await User.findOne({ email: testUser.email });
        if (!user.otp) throw new Error("OTP not found in database!");
        console.log(`✅ Found OTP in DB: ${user.otp}`);

        // 6. Verify OTP
        console.log("\n4. Verifying OTP...");
        const verifyRes = await axios.post(`${API_URL}/organisation/${org._id}/verify-otp`, {
            otp: user.otp
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Verification Success: ${verifyRes.data.message}`);

        // 7. Check Final Status
        const meRes = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`\n5. Final Status: ${meRes.data.orgStatus}`);
        console.log(`✅ User is in Org: ${meRes.data.organization?.name}`);

        if (meRes.data.orgStatus === "approved") {
            console.log("\n🎉 ALL OTP FLOW TESTS PASSED!");
        } else {
            console.log("\n❌ Test Failed: User status not approved");
        }

        // Cleanup: Remove test user
        await User.deleteOne({ email: testUser.email });
        console.log(`\n🧹 Cleaned up test user: ${testUser.email}`);

    } catch (err) {
        console.error("\n❌ Test Failed!");
        console.error(err.response?.data || err.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

testOtpFlow();

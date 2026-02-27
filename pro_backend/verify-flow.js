const axios = require("axios");

async function verifyFlow() {
    try {
        console.log("--- Testing Admin Flow ---");
        const adminLogin = await axios.post("http://localhost:5000/api/auth/login", {
            email: "admin@test.com",
            password: "password123"
        });
        const adminToken = adminLogin.data.token;
        console.log("✅ Admin Logged In");

        const adminMe = await axios.get("http://localhost:5000/api/auth/me", {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log("✅ Admin /me (with org):", adminMe.data.organization?.name || "MISSING ORG");

        console.log("\n--- Testing Organization Fetch ---");
        const orgs = await axios.get("http://localhost:5000/api/organisation", {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log("✅ Orgs Found:", orgs.data.length);

        console.log("\n--- Testing Passenger Flow ---");
        const bobLogin = await axios.post("http://localhost:5000/api/auth/login", {
            email: "bob@test.com",
            password: "bob123"
        });
        const bobToken = bobLogin.data.token;
        console.log("✅ Bob Logged In");

        const bobMe = await axios.get("http://localhost:5000/api/auth/me", {
            headers: { Authorization: `Bearer ${bobToken}` }
        });
        console.log("✅ Bob /me (independent):", bobMe.data.organization ? "Has Org" : "Independent Account");

        console.log("\n✅ ALL TESTS PASSED!");
    } catch (err) {
        console.error("❌ Test Failed:", err.response?.status);
        console.error("Response Data:", JSON.stringify(err.response?.data, null, 2));
        if (!err.response) console.error("FULL ERROR:", err);
        process.exit(1);
    }
}

verifyFlow();

const axios = require("axios");

async function testOrgs() {
    try {
        // We need a token because the route is protected by 'auth' middleware
        // Let's login first (assuming the user registered in the previous step exists)
        const loginRes = await axios.post("http://localhost:5000/api/auth/login", {
            email: "test@example.com",
            password: "password123"
        });
        const token = loginRes.data.token;

        const res = await axios.get("http://localhost:5000/api/organisation", {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ Organizations Fetched:", res.data);
    } catch (err) {
        console.error("❌ Fetch Failed:", err.response?.status);
        console.error("Detailed Errors:", JSON.stringify(err.response?.data, null, 2));
    }
}

testOrgs();

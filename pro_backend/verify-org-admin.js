const axios = require("axios");

async function verifyOrgAdmin() {
    try {
        console.log("--- Testing Org Admin Backend Logic ---");
        const adminLogin = await axios.post("http://localhost:5000/api/auth/login", {
            email: "admin@test.com",
            password: "password123"
        });
        const token = adminLogin.data.token;

        // NEED TO FETCH /me TO GET ORG ID
        const profile = await axios.get("http://localhost:5000/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const orgId = profile.data.organization?._id || profile.data.organization;

        console.log("✅ Admin Logged In, Org ID:", orgId);

        console.log("\n1. Testing GET /requests with valid ID");
        const requests = await axios.get(`http://localhost:5000/api/organisation/${orgId}/requests`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ Requests fetched:", requests.data.length);

        console.log("\n2. Testing GET /requests with 'null' ID (Should be 400)");
        try {
            await axios.get(`http://localhost:5000/api/organisation/null/requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.log("✅ Received expected 400 for null ID:", err.response.status);
        }

        console.log("\n✅ ORG ADMIN BACKEND VERIFIED!");
    } catch (err) {
        console.error("❌ Test Failed:", err.response?.status);
        console.error("Response Data:", JSON.stringify(err.response?.data, null, 2));
        if (!err.response) console.error("FULL ERROR:", err);
        process.exit(1);
    }
}

verifyOrgAdmin();

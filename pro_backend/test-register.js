const axios = require("axios");

async function testRegister() {
    try {
        const res = await axios.post("http://localhost:5000/api/auth/register", {
            name: "Test User",
            email: "test@example.com",
            password: "password123",
            role: "passenger"
        });
        console.log("✅ Registration Successful:", res.data);
    } catch (err) {
        console.error("❌ Registration Failed:", err.response?.status);
        console.error("Detailed Errors:", JSON.stringify(err.response?.data, null, 2));
    }
}

testRegister();

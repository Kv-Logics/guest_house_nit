const axios = require('axios');

async function check() {
    try {
        const res = await axios.get("http://localhost:5000/api/bookings/tariffs");
        console.log("Success:", res.data.success);
        console.log("Data length:", res.data.data.length);
        if (res.data.data.length > 0) {
            console.log("First item:", res.data.data[0]);
        }
    } catch(e) {
        console.error("Error:", e.message);
    }
}
check();

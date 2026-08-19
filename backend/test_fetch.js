async function run() {
    try {
        const res = await fetch(`http://127.0.0.1:5001/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@techzon.com', password: 'password123' })
        });
        
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Body:", JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}
run();

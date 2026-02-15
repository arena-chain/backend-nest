// Test script to login as admin and fetch pending managers
async function test() {
    try {
        // Step 1: Login as admin
        console.log('Logging in as admin...');
        const loginRes = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@arenachain.com',
                password: '123456'
            })
        });

        if (!loginRes.ok) {
            console.log('Login failed:', loginRes.status);
            const text = await loginRes.text();
            console.log('Error:', text);
            return;
        }

        const loginData = await loginRes.json();
        console.log('Login successful!');
        const token = loginData.accessToken;

        // Step 2: Fetch pending managers
        console.log('\nFetching pending managers...');
        const res = await fetch('http://localhost:3000/team-manager/pending', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log('\nPending managers response:');
            console.log(JSON.stringify(data, null, 2));
        } else {
            const text = await res.text();
            console.log('Error body:', text);
        }
    } catch (e) {
        console.log('Fetch error:', e.message);
    }
}
test();

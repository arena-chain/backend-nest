// Test approve endpoint with actual userId
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
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.accessToken;

        // Step 2: Get pending managers to find a userId
        console.log('\nFetching pending managers...');
        const pendingRes = await fetch('http://localhost:3000/team-manager/pending', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const pending = await pendingRes.json();
        console.log('Pending managers count:', pending.length);

        if (pending.length > 0) {
            const firstManager = pending[0];
            console.log('\nFirst manager:');
            console.log('- userId object:', firstManager.userId);
            console.log('- userId._id:', firstManager.userId?._id);
            console.log('- userId._id type:', typeof firstManager.userId?._id);

            const userIdToApprove = firstManager.userId._id;
            console.log('\nAttempting to approve userId:', userIdToApprove);

            // Step 3: Try to approve
            const approveRes = await fetch(`http://localhost:3000/team-manager/${userIdToApprove}/approve`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('Approve status:', approveRes.status);
            if (approveRes.ok) {
                const result = await approveRes.json();
                console.log('Success:', result);
            } else {
                const error = await approveRes.text();
                console.log('Error:', error);
            }
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();

// Test Riot API endpoint
const fetch = require('node-fetch');

async function testRiotApi() {
    const RIOT_API_KEY = 'RGAPI-2a3fbbad-3a5a-49eb-b2fe-0af4ee210bf7';

    // Test 1: Direct Riot API call
    console.log('=== Test 1: Direct Riot API Call ===');
    const gameName = 'jsk314ckle';
    const tagLine = '314';
    const region = 'euw1';
    const routing = 'europe'; // EUW1 uses 'europe' routing

    const url = `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    console.log('URL:', url);

    try {
        const response = await fetch(url, {
            headers: { 'X-Riot-Token': RIOT_API_KEY }
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n✅ Direct API call successful!');
            console.log('PUUID:', data.puuid);
        } else {
            console.log('\n❌ Direct API call failed');
        }
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 2: Backend endpoint
    console.log('\n=== Test 2: Backend Endpoint ===');
    try {
        // First login to get token
        const loginRes = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'habibathimenn@gmail.com',
                password: '123456'
            })
        });

        if (!loginRes.ok) {
            console.log('Login failed');
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.accessToken;
        console.log('Logged in successfully');

        // Test backend endpoint
        const backendRes = await fetch('http://localhost:3000/riot-api/account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                gameName: gameName,
                tagLine: tagLine,
                region: region
            })
        });

        console.log('Backend Status:', backendRes.status);
        const backendData = await backendRes.json();
        console.log('Backend Response:', JSON.stringify(backendData, null, 2));

        if (backendRes.ok) {
            console.log('\n✅ Backend endpoint successful!');
        } else {
            console.log('\n❌ Backend endpoint failed');
        }
    } catch (error) {
        console.log('Backend Error:', error.message);
    }
}

testRiotApi();

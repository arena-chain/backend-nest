// Simple test - just check if backend is running
const fetch = require('node-fetch');

async function quickTest() {
    try {
        const response = await fetch('http://localhost:3000');
        console.log('Backend status:', response.status);
        console.log('Backend is running!');
    } catch (error) {
        console.log('❌ Backend is NOT running!');
        console.log('Error:', error.message);
        console.log('\nPlease start the backend with: npm run start:dev');
    }
}

quickTest();

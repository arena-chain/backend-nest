const axios = require('axios');

async function testEndpoint() {
  try {
    const response = await axios.get('http://localhost:3000/api/tickets/templates');
    console.log('Status:', response.status);
    console.log('Data length:', response.data.length);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Response Data:', err.response.data);
    }
  }
}

testEndpoint();

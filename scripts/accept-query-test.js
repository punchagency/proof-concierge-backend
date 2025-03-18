const axios = require('axios');

// Configuration
const baseUrl = 'http://localhost:3000/v1'; // Change this to your actual API URL
const queryId = 1; // Change this to the donor query ID you want to accept

// Admin credentials
const adminCredentials = {
  username: 'admin1',
  password: 'password123'
};

async function main() {
  try {
    console.log('Starting test...');
    
    // Step 1: Login as admin
    console.log('Step 1: Logging in as admin...');
    const loginResponse = await axios.post(`${baseUrl}/auth/login`, adminCredentials);
    const token = loginResponse.data.access_token;
    
    if (!token) {
      throw new Error('Failed to get token');
    }
    
    console.log('Successfully logged in and got token');
    
    // Set authorization header for subsequent requests
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    
    // Step 2: Accept the query
    console.log(`Step 2: Accepting query with ID ${queryId}...`);
    const acceptResponse = await axios.post(
      `${baseUrl}/donor-queries/${queryId}/accept`, 
      {}, 
      authHeader
    );
    
    console.log('Query acceptance response:', acceptResponse.data);
    
    // Step 3: Try to access call requests
    console.log(`Step 3: Getting call requests for query ${queryId}...`);
    const callRequestsResponse = await axios.get(
      `${baseUrl}/communication/call/${queryId}/requests`, 
      authHeader
    );
    
    console.log('Call requests response:', callRequestsResponse.data);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error during test:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
  }
}

main(); 
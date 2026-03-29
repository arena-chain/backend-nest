// Test userId extraction
const sampleResponse = {
    "_id": "6991cf57ac63f7a26bd2aecb",
    "userId": {
        "_id": "6991cf57ac63f7a26bd2aec9",
        "email": "test@example.com",
        "nickname": "test"
    },
    "team": {
        "_id": "6991c0c2856875d83ad9f5bf",
        "name": "Test Team"
    },
    "organizationName": "Test Org",
    "status": "pending"
};

// Simulate Flutter extraction logic
let extractedUserId;
if (sampleResponse.userId != null) {
    if (typeof sampleResponse.userId === 'object') {
        // userId is populated as a User object, extract _id
        extractedUserId = sampleResponse.userId._id?.toString();
    } else {
        // userId is just a string ID
        extractedUserId = sampleResponse.userId.toString();
    }
}

console.log('Extracted userId:', extractedUserId);
console.log('Type:', typeof extractedUserId);
console.log('Is empty?', extractedUserId === '');
console.log('Is null/undefined?', extractedUserId == null);

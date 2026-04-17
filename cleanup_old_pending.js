// MongoDB script to delete old pending managers without firstName/lastName
// Run this in MongoDB Compass or mongosh

// Connect to your database first, then run:

db.teammanagerprofiles.deleteMany({
    status: 'pending',
    firstName: { $exists: false }
});

// This will delete all pending team manager profiles that don't have the firstName field
// (i.e., the old test data created before we added these fields to the backend)

// After running this, create new test registrations from the Flutter app
// and they will have all the proper fields saved

const axios = require('axios');

const API_URL = 'http://localhost:3000/abonnements';

const plans = [
    {
        name: 'Free',
        price: 0,
        durationInMonths: 1,
        features: ['Basic Support', 'Access to Free Tournaments'],
        description: 'Starter plan for new players'
    },
    {
        name: 'Pro',
        price: 9.99,
        durationInMonths: 1,
        features: ['Priority Support', 'Access to Pro Tournaments', 'No Ads'],
        description: 'Perfect for regular competitors'
    },
    {
        name: 'Premium',
        price: 19.99,
        durationInMonths: 1,
        features: ['24/7 Support', 'All Tournaments Access', 'Exclusive Badge', 'No Ads'],
        description: 'Ultimate experience for pros'
    }
];

async function seedPlans() {
    console.log('🌱 Seeding subscription plans...');

    for (const plan of plans) {
        try {
            const response = await axios.post(API_URL, plan);
            console.log(`✅ Created plan: ${plan.name} (ID: ${response.data._id})`);
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log(`⚠️  Plan ${plan.name} might already exist or invalid data.`);
                console.log(`Error: ${JSON.stringify(error.response.data)}`);
            } else {
                console.error(`❌ Failed to create plan ${plan.name}:`, error.message);
            }
        }
    }
}

seedPlans();

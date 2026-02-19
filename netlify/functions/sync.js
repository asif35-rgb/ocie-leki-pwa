const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const { userId, medications, subscription } = data;

        if (!userId || !medications) {
            return { statusCode: 400, body: 'Missing userId or medications' };
        }

        const store = getStore({ name: 'kocie-leki-data', siteID: process.env.SITE_ID, token: process.env.NETLIFY_API_TOKEN });

        // Store user data
        // Key: userId
        // Value: JSON string of meds + subscription
        await store.set(userId, JSON.stringify({
            medications,
            subscription,
            lastUpdated: new Date().toISOString()
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Data synced successfully' })
        };
    } catch (error) {
        console.error('Sync Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};

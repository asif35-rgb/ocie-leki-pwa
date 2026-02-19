const { getStore } = require('@netlify/blobs');
const webpush = require('web-push');

// Config Web Push from Environment Variables
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:test@test.com';

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);
}

exports.handler = async (event, context) => {
    // Check if keys are configured
    if (!publicVapidKey || !privateVapidKey) {
        console.error('VAPID Keys not configured in Netlify Environment Variables');
        return { statusCode: 500, body: 'Server config error' };
    }

    try {
         const store = getStore({ 
    name: 'kocie-leki-data', 
    siteID: process.env.MY_SITE_ID, 
    token: process.env.NETLIFY_API_TOKEN 
});
        const { blobs } = await store.list(); // List all user keys

        const now = new Date();
        // Adjust for desired timezone (e.g., UTC+1 for Poland approx)
        // Better: store user timezone in sync.js and use that.
        // For simplicity: We assume user stored time strings "HH:MM".
        // We get current Netlify server time (UTC) and convert to user's likely time?
        // OR simpler: frontend sends "time" relative to...
        // Let's assume Poland Time (UTC+1/UTC+2) for this user request context
        const formatter = new Intl.DateTimeFormat('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Warsaw'
        });
        const currentTime = formatter.format(now); // "HH:MM"

        console.log('Checking notifications for time (PL):', currentTime);

        const notificationsSent = [];

        for (const blob of blobs) {
            const userId = blob.key;
            const rawData = await store.get(userId);
            if (!rawData) continue;

            const userData = JSON.parse(rawData);
            const { medications, subscription } = userData;

            if (!subscription) continue;

            // Check if any med matches current time
            const medToTake = medications.find(med => med.time === currentTime);

            if (medToTake) {
                console.log(`Sending notification to user ${userId} for ${medToTake.name}`);

                const payload = JSON.stringify({
                    title: 'Kocie Leki 🐾',
                    body: `Czas na: ${medToTake.name} (${medToTake.dose} szt.)! Miau!`,
                    icon: './icon-192.png'
                });

                try {
                    await webpush.sendNotification(subscription, payload);
                    notificationsSent.push(userId);
                } catch (error) {
                    console.error(`Error sending to ${userId}:`, error);
                    // If 404/410, remove subscription?
                    if (error.statusCode === 404 || error.statusCode === 410) {
                        // Cleanup logic could go here
                    }
                }
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Check complete',
                notificationsSent: notificationsSent.length
            })
        };

    } catch (error) {
        console.error('Scheduled Check Error:', error);
        return { statusCode: 500, body: 'Internal Error' };
    }
};

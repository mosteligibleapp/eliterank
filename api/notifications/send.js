// api/notifications/send.js
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userIds, title, message, url } = req.body;

  if (!userIds || !title || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.VITE_ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: process.env.VITE_ONESIGNAL_APP_ID,
        include_external_user_ids: Array.isArray(userIds) ? userIds : [userIds],
        headings: { en: title },
        contents: { en: message },
        url: url || 'https://eliterank.co'
      })
    });

    const data = await response.json();
    return res.status(200).json({ success: true, data });
    
  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ error: error.message });
  }
}

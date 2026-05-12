
export default async function handler(req, res) {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Exchange Rate API Key is not configured on Vercel' });
    }

    try {
        const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
}

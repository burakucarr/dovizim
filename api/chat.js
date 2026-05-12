
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API Key is not configured on Vercel' });
    }

    try {
        let attempts = 0;
        const maxAttempts = 3;
        let response;
        let data;

        while (attempts < maxAttempts) {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Sen 'Dövizim' adlı bir finans uygulamasının yapay zeka asistanısın. Kullanıcıya finansal piyasalar, döviz, altın ve yatırım konularında kısa, profesyonel ve öz bir dille cevap ver. Asla çok uzun paragraflar yazma. Kullanıcının sorusu: "${message}"`
                        }]
                    }]
                })
            });

            data = await response.json();

            // Eğer kota hatası (429) alırsak ve hala deneme hakkımız varsa bekle ve tekrar dene
            if (response.status === 429 && attempts < maxAttempts - 1) {
                attempts++;
                const waitTime = Math.pow(2, attempts) * 1000; // Üstel bekleme (2s, 4s...)
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            break;
        }

        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch from Gemini API' });
    }
}

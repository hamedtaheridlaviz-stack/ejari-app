export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, mimeType, side } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

    const prompt = side === 'back'
      ? `This is the back of a UAE Emirates ID. Extract any visible information: address, employer, occupation, card expiry date. Return ONLY a JSON object with keys: address, employer, occupation, expiryDate. Use null for missing fields.`
      : `This is a UAE Emirates ID card (front side). Extract: full name in English, Emirates ID number (format: 784-XXXX-XXXXXXX-X), nationality, date of birth (DD/MM/YYYY), gender, expiry date. Return ONLY a valid JSON object with keys: fullName, emiratesId, nationality, dateOfBirth, gender, expiryDate. Use null for fields you cannot read clearly.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch { return res.status(422).json({ error: 'Could not parse ID', raw: text }); }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

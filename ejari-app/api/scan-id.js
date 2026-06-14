export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Try both possible env var names
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    return res.status(503).json({ 
      error: 'API key not configured. Go to Vercel → Settings → Environment Variables → add ANTHROPIC_API_KEY → redeploy.',
      env_keys_present: Object.keys(process.env).filter(k => !k.includes('PATH') && !k.includes('NODE')).slice(0, 10)
    });
  }

  try {
    const { imageBase64, mimeType, side, docType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

    let prompt;
    if (docType === 'deed') {
      prompt = `This is a Dubai Land Department (DLD) title deed or property document. Extract all visible property details: owner full name, unit/apartment number, building name, location/area, plot number, property type, total area in square meters, DEWA premises number, Makani number. Return ONLY valid JSON with keys: ownerName, unitNo, buildingName, location, plotNo, propertyType, area, dewaNo, makaniNo. Use null for missing fields.`;
    } else if (docType === 'passport') {
      prompt = `This is a passport. Extract: full name in English, passport number, nationality, date of birth (DD/MM/YYYY), gender, expiry date. Return ONLY valid JSON with keys: fullName, passportNo, nationality, dateOfBirth, gender, expiryDate. Use null for unclear fields.`;
    } else if (side === 'back') {
      prompt = `UAE Emirates ID back side. Extract: address, employer, occupation, expiry date. Return ONLY JSON: {address, employer, occupation, expiryDate}. Use null for missing.`;
    } else {
      prompt = `UAE Emirates ID front side. Extract: full name in English, Emirates ID number (format 784-XXXX-XXXXXXX-X), nationality, date of birth DD/MM/YYYY, gender, expiry date. Return ONLY valid JSON: {fullName, emiratesId, nationality, dateOfBirth, gender, expiryDate}. Use null for unclear fields.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `Anthropic API error ${response.status}`, detail: errText.slice(0, 300) });
    }

    const result = await response.json();
    const text = (result.content?.[0]?.text || '').replace(/```json|```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(text); }
    catch { return res.status(422).json({ error: 'Could not parse AI response', raw: text.slice(0, 300) }); }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

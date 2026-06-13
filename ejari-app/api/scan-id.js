export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, mimeType, side, docType } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY in Vercel Environment Variables' });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const cleanBase64 = imageBase64.includes(',')
      ? imageBase64.split(',').pop()
      : imageBase64;

    let prompt;

    if (docType === 'passport') {
      prompt = `
You are reading a passport image.

Extract only clearly visible information.

Return ONLY valid JSON. No markdown. No explanation.

Required JSON keys:
{
  "fullName": null,
  "passportNumber": null,
  "nationality": null,
  "dateOfBirth": null,
  "gender": null,
  "expiryDate": null
}

Rules:
- fullName must be the English full name exactly as visible.
- dateOfBirth and expiryDate should be DD/MM/YYYY if possible.
- Use null if a value is not clearly visible.
`;
    } else if (docType === 'deed' || docType === 'titleDeed') {
      prompt = `
You are reading a Dubai property title deed or property ownership document.

Extract only clearly visible information.

Return ONLY valid JSON. No markdown. No explanation.

Required JSON keys:
{
  "ownerName": null,
  "propertyLocation": null,
  "buildingName": null,
  "unitType": null,
  "propertyNo": null,
  "propertyArea": null,
  "premisesNo": null,
  "plotNo": null,
  "makaniNo": null,
  "usage": null
}

Rules:
- usage must be one of: residential, commercial, industrial, or null.
- propertyArea should be only the number if possible.
- Use null if a value is not clearly visible.
`;
    } else if (side === 'back') {
      prompt = `
You are reading the back of a UAE Emirates ID.

Extract only clearly visible information.

Return ONLY valid JSON. No markdown. No explanation.

Required JSON keys:
{
  "address": null,
  "employer": null,
  "occupation": null,
  "expiryDate": null
}

Rules:
- Use null if a value is not clearly visible.
`;
    } else {
      prompt = `
You are reading the front side of a UAE Emirates ID card.

Extract only clearly visible information.

Return ONLY valid JSON. No markdown. No explanation.

Required JSON keys:
{
  "fullName": null,
  "emiratesId": null,
  "nationality": null,
  "dateOfBirth": null,
  "gender": null,
  "expiryDate": null
}

Rules:
- fullName must be the English name exactly as visible on the card.
- emiratesId must match UAE format like 784-1969-3276038-0.
- dateOfBirth and expiryDate should be DD/MM/YYYY if possible.
- gender should be M, F, Male, Female, or null.
- Use null if a value is not clearly visible.
`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 800,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType || 'image/jpeg',
                  data: cleanBase64
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      })
    });

    const resultText = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Anthropic API error',
        status: response.status,
        details: resultText
      });
    }

    let result;
    try {
      result = JSON.parse(resultText);
    } catch (err) {
      return res.status(500).json({
        error: 'Anthropic returned non-JSON response',
        raw: resultText
      });
    }

    const text = result.content?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({
        error: 'Could not find JSON in Claude response',
        raw: text
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      return res.status(422).json({
        error: 'Could not parse JSON from Claude response',
        raw: text
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Server error'
    });
  }
}

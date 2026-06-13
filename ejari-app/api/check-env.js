export default async function handler(req, res) {
  return res.status(200).json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    keyStartsWith: process.env.ANTHROPIC_API_KEY
      ? process.env.ANTHROPIC_API_KEY.slice(0, 12)
      : null,
    nodeEnv: process.env.NODE_ENV || null
  });
}

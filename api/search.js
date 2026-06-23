export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: GROQ_API_KEY missing' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        // This forces the output to be a valid JSON object
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system", 
            content: "You are a shopping AI. Return a JSON object with a single key 'results' which is an array of 4 products. Each product must have: name, description, rating, price, status (safe/caution/scam), and reason."
          },
          {
            role: "user",
            content: `Search for: ${query}`
          }
        ]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error("Groq API Error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    // Parse the response
    const content = JSON.parse(data.choices[0].message.content);
    res.status(200).json(content);
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Failed to fetch results" });
  }
}

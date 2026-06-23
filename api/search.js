export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { query } = req.body;
  const { GROQ_API_KEY, SERPAPI_KEY } = process.env;

  try {
    // 1. Get Product Data from Groq
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        response_format: { type: "json_object" },
        messages: [{
          role: "system", 
          content: "You are an Indian shopping assistant. Return JSON with 'results' array (4 products). Fields: name, description, rating, price (format ₹), status (safe/caution/scam), reason."
        }, {
          role: "user",
          content: `Search for: ${query} in India`
        }]
      })
    });

    const groqData = await groqRes.json();
    let products = JSON.parse(groqData.choices[0].message.content).results;

    // 2. Fetch Link AND Image in ONE call per product
    const finalResults = await Promise.all(products.map(async (p) => {
      try {
        const serpRes = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(p.name + " India")}&api_key=${SERPAPI_KEY}&gl=in&location=India&hl=en`);
        const data = await serpRes.json();
        
        // Use the first organic result link and its associated thumbnail
        return { 
          ...p, 
          url: data.organic_results?.[0]?.link || `https://www.amazon.in/s?k=${encodeURIComponent(p.name)}`,
          image: data.organic_results?.[0]?.thumbnail || data.organic_results?.[0]?.sitelinks?.inline?.[0]?.thumbnail || ""
        };
      } catch (e) { 
        return { ...p, url: "#", image: "" }; 
      }
    }));

    res.status(200).json({ results: finalResults });
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { query } = req.body;
  const { GROQ_API_KEY, SERPAPI_KEY } = process.env;

  try {
    // 1. Get Product Data
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        response_format: { type: "json_object" },
        messages: [{
          role: "system", 
          content: "Return JSON with 'results' array of 4 products. Fields: name, description, rating, price, status, reason."
        }, {
          role: "user",
          content: `Search for: ${query} in India`
        }]
      })
    });

    const groqData = await groqRes.json();
    let products = JSON.parse(groqData.choices[0].message.content).results;

    // 2. Fetch both Image AND Direct Product Link using SerpAPI
    const finalResults = await Promise.all(products.map(async (p) => {
      try {
        // Search Google for the product to get the direct Amazon link
        const serpRes = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(p.name + " amazon india")}&api_key=${SERPAPI_KEY}&gl=in&location=India&hl=en`);
        const data = await serpRes.json();
        
        // Grab the first organic link (the direct product page) and the first image
        const directUrl = data.organic_results?.[0]?.link || `https://www.amazon.in/s?k=${encodeURIComponent(p.name)}`;
        const imageUrl = data.inline_images?.[0]?.original || ""; 

        return { ...p, url: directUrl, image: imageUrl };
      } catch (e) { return { ...p, url: "#", image: "" }; }
    }));

    res.status(200).json({ results: finalResults });
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
}

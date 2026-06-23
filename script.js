export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { query } = req.body;
  const { SERPAPI_KEY } = process.env;

  try {
    const serpRes = await fetch(`https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}&gl=in&location=India&hl=en`);
    const data = await serpRes.json();
    
    if (!data.shopping_results) return res.status(404).json({ results: [] });

    const finalResults = data.shopping_results.slice(0, 4).map(p => ({
      name: p.title,
      // Keep original snippet, but clean it up if it's too long
      description: p.snippet || "Explore this product on the official store for full specifications.",
      rating: p.rating || "N/A",
      price: p.price || "Check site",
      status: "SAFE",
      url: p.product_link || p.link,
      image: p.thumbnail
    }));

    res.status(200).json({ results: finalResults });
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
}

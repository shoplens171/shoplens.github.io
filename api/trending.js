module.exports = async function handler(req, res) {
  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_shopping&q=trending+products&api_key=${process.env.SERPAPI_KEY}`
    );

    const data = await response.json();

    if (!data.shopping_results) {
      return res.status(500).json({ error: "No trending products found." });
    }

    const items = data.shopping_results.slice(0, 9).map(item => ({
      emoji: "🛍️",
      name: item.title,
      trend: item.source || "Popular online",
      heat: "🔥 Trending",
      price: item.price || "Price unavailable",
      image: item.thumbnail || ""
    }));

    res.status(200).json(items);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

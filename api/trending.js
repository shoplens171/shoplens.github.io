export default async function handler(req, res) {

  const categories = [
    "trending clothing india",
    "trending shoes india",
    "trending beauty products india",
    "trending accessories india",
    "trending gadgets india"
  ];

  try {

    const results = [];

    for (const category of categories) {

      const response = await fetch(
        `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
          category
        )}&gl=in&hl=en&num=5&api_key=${process.env.SERPAPI_KEY}`
      );

      const data = await response.json();

      const products = (data.shopping_results || [])
        .slice(0, 5)
        .map(item => ({
          name: item.title || "Unknown Product",
          price: item.price || "Price unavailable",
          image:
            item.thumbnail ||
            item.image ||
            "https://via.placeholder.com/300?text=No+Image",
          source: item.source || "Online",
          link: item.link || item.product_link || "#"
        }));

      results.push({
        title: category
          .replace("trending ", "")
          .replace(" india", "")
          .replace(/\b\w/g, c => c.toUpperCase()),
        products
      });

    }

    return res.status(200).json(results);

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: err.message
    });

  }
}

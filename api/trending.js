module.exports = async function handler(req, res) {

  const categories = [
    "trending clothing india",
    "trending shoes india",
    "trending beauty products india",
    "trending accessories india",
    "trending gadgets india"
  ];

  try {

    let results = [];

    for (const category of categories) {

      const response = await fetch(
        `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(category)}&gl=in&hl=en&num=5&api_key=${process.env.SERPAPI_KEY}`
      );

      const data = await response.json();

      const products = (data.shopping_results || []).slice(0,5).map(item => ({
        category,
        name: item.title,
        price: item.price || "Price unavailable",
        image: item.thumbnail || "",
        source: item.source || "Online",
        link: item.link || "#"
      }));

      results.push({
        title: category
          .replace("trending ","")
          .replace(" india","")
          .replace(/\b\w/g,c=>c.toUpperCase()),
        products
      });

    }

    res.status(200).json(results);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }

};

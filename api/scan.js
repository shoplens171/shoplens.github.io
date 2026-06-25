export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: "No image received" });
  }

  try {
    // =========================
    // 1. VISION ANALYSIS
    // =========================
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `
STRICT PRODUCT DETECTION TASK

Rules:
- Identify ONLY what is visible.
- Provide the most common, consumer-friendly name (e.g., "Apple iPhone 15", "Nike Air Force 1").
- NEVER assume Pro / Pro Max / Plus / Storage size unless clearly readable on the product.
- NEVER guess hidden specs.
- If uncertain -> choose the base model or generic brand category.

Examples:
- Image of red sneakers -> {"product_name": "Red Sneakers", "confidence": 95}
- Image of a branded laptop -> {"product_name": "Brand Laptop", "confidence": 90}

Return ONLY JSON:
{
  "product_name": "",
  "confidence": 0
}
                  `,
                },
                {
                  type: "image_url",
                  image_url: { url: image },
                },
              ],
            },
          ],
          temperature: 0,
        }),
      }
    );

    const groqText = await groqRes.text();

    let groqData;
    try {
      groqData = JSON.parse(groqText);
    } catch {
      return res.status(500).json({ error: "Vision parsing failed" });
    }

    const raw = groqData?.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      parsed = { product_name: raw };
    }

    let productName = parsed.product_name || "";

    if (!productName) {
      return res.status(500).json({ error: "No product detected" });
    }

    // =========================
    // 2. CLEAN PRODUCT NAME
    // =========================
    productName = productName
      .replace(/pro max/gi, "")
      .replace(/plus/gi, "")
      .trim();

    // =========================
    // 3. SERPAPI SEARCH
    // =========================
    const serpRes = await fetch(
      `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
        productName
      )}&gl=in&hl=en&api_key=${process.env.SERPAPI_KEY}`
    );

    const serpData = await serpRes.json();
    const results = serpData?.shopping_results || [];

    if (results.length === 0) {
      return res.status(404).json({ error: "No products found in the shopping index." });
    }

    // =========================
    // 4. SAFE HELPERS
    // =========================
    const cleanUrl = (url) => {
      if (!url) return null;
      try {
        const u = new URL(url);
        return u.toString();
      } catch {
        return null;
      }
    };

    const cleanPrice = (p) =>
      p ? p.toString().replace(/[^\d₹$€,.]/g, "").trim() : "N/A";

    // =========================
    // 5. FILTER RESULTS
    // =========================
    // Filter out single-letter words to avoid matching noise
    const queryWords = productName.toLowerCase().split(" ").filter((w) => w.length > 1);

    const filtered = results.filter((item) => {
      const title = item.title?.toLowerCase() || "";
      const matchCount = queryWords.filter((word) => title.includes(word)).length;
      // Keep item if at least 50% of the words match, or a minimum of 2 words
      return matchCount >= Math.min(2, Math.ceil(queryWords.length / 2));
    });

    // Fallback: If the filter was too aggressive and wiped out all results, 
    // trust the raw API sorting instead.
    const finalResults = filtered.length > 0 ? filtered : results;

    const first = finalResults.find((r) => r.price) || finalResults[0];

    // =========================
    // 6. BUILD RESPONSE
    // =========================
    const safeImage =
      first?.thumbnail ||
      results.find((r) => r.thumbnail)?.thumbnail ||
      "https://via.placeholder.com/150?text=No+Image";

    const buyUrl = cleanUrl(first?.product_link) || cleanUrl(first?.link) || null;

    return res.status(200).json({
      product_name: first?.title || productName,
      description: first?.snippet || "Detected by ShopLens AI",

      price: cleanPrice(first?.price),
      image: safeImage,
      buy_url: buyUrl,

      store: first?.source || "Unknown",
      rating: first?.rating || "N/A",
      reviews: first?.reviews || "N/A",

      confidence: parsed.confidence || 70,
      safety_score: 98,
      match_score: first?.price ? 95 : 80,

      alternatives: finalResults.slice(0, 5).map((item) => ({
        title: item.title,
        price: cleanPrice(item.price),
        image: item.thumbnail || "https://via.placeholder.com/150?text=No+Image",
        link: cleanUrl(item.product_link) || cleanUrl(item.link) || null,
      })),
    });
  } catch (err) {
    console.error("Scanner API Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

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
    // 1. PRODUCT DETECTION
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
You are a product identification system.

Identify ONLY the visible product.

Rules:
- Never guess Pro, Pro Max, Plus, Ultra, storage size, edition or generation.
- If uncertain return the base model.
- Return JSON only.

Example:

{
  "product_name":"Apple iPhone 15",
  "confidence":92
}
`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image
                  }
                }
              ]
            }
          ],
          temperature: 0
        })
      }
    );

    const groqText = await groqRes.text();

    let groqData;

    try {
      groqData = JSON.parse(groqText);
    } catch {
      return res.status(500).json({
        error: "Vision parsing failed"
      });
    }

    const raw =
      groqData?.choices?.[0]?.message?.content || "";

    let parsed;

    try {
      const cleaned = raw
        .replaceAll("```json", "")
        .replaceAll("```", "")
        .trim();

      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        product_name: raw,
        confidence: 70
      };
    }

    let productName = parsed.product_name?.trim();

    if (!productName) {
      return res.status(500).json({
        error: "No product detected"
      });
    }

    // =========================
    // 2. SERPAPI SEARCH
    // =========================

    const serpRes = await fetch(
      `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
        productName
      )}&gl=in&hl=en&api_key=${process.env.SERPAPI_KEY}`
    );

    const serpData = await serpRes.json();

    const results =
      serpData.shopping_results || [];

    // =========================
    // 3. HELPERS
    // =========================

    const cleanPrice = (price) => {
      if (!price) return "N/A";

      return price
        .toString()
        .replace(/[^\d₹$€,.]/g, "")
        .trim();
    };

    const cleanImage = (url) => {
      if (!url) {
        return "https://via.placeholder.com/300?text=No+Image";
      }

      return url;
    };

    const cleanUrl = (url) => {
      if (!url) return null;

      try {
        return new URL(url).toString();
      } catch {
        return null;
      }
    };

    // =========================
    // 4. SMART FILTERING
    // =========================

    const search = productName.toLowerCase();

    let filtered = results.filter((item) => {
      const title =
        item.title?.toLowerCase() || "";

      return title.includes(search);
    });

    if (filtered.length === 0) {
      filtered = results;
    }

    const first =
      filtered.find((r) => r.price) ||
      filtered[0];

    if (!first) {
      return res.status(404).json({
        error: "No shopping results found"
      });
    }

    console.log("MAIN PRODUCT:", first);

    // =========================
    // 5. RESPONSE
    // =========================

    return res.status(200).json({
      product_name:
        first.title || productName,

      description:
        first.snippet ||
        "Detected by ShopLens AI",

      price: cleanPrice(first.price),

      image: cleanImage(
        first.thumbnail ||
          first.image
      ),

      buy_url:
        cleanUrl(first.link) ||
        cleanUrl(first.product_link),

      store:
        first.source ||
        "Unknown Store",

      rating:
        first.rating || "N/A",

      reviews:
        first.reviews || "N/A",

      confidence:
        parsed.confidence || 70,

      safety_score: 98,

      match_score:
        first.price ? 95 : 80,

      sales_trend: "High",

      alternatives: filtered
        .filter((item) => item !== first)
        .slice(0, 5)
        .map((item) => ({
          title: item.title,

          price: cleanPrice(
            item.price
          ),

          image: cleanImage(
            item.thumbnail ||
              item.image
          ),

          link:
            cleanUrl(item.link) ||
            cleanUrl(
              item.product_link
            )
        }))
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
}

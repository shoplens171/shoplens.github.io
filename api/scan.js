export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: "No image received." });
  }

  try {
    // =========================
    // 1. GROQ VISION REQUEST
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
You are a strict product recognition system.

Identify ONLY the exact product shown in the image.

Rules:
- Do NOT guess Pro / Pro Max / Plus unless clearly visible
- Do NOT over-upgrade models
- Do NOT assume storage or hidden specs
- If uncertain, choose base model only

Return ONLY valid JSON:

{
  "product_name": ""
}
                  `,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image,
                  },
                },
              ],
            },
          ],
          temperature: 0,
        }),
      }
    );

    const groqText = await groqRes.text();

    let groqData = {};
    try {
      groqData = groqText ? JSON.parse(groqText) : {};
    } catch (e) {
      console.log("Groq parse error:", e);
      return res.status(500).json({ error: "Invalid Groq response" });
    }

    if (!groqRes.ok) {
      console.log("GROQ ERROR:", groqData);
      return res.status(500).json({
        error: groqData,
      });
    }

    // =========================
    // 2. PARSE PRODUCT NAME
    // =========================
    const raw =
      groqData.choices?.[0]?.message?.content || "";

    let productName = "";

    try {
      const cleaned = raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      productName = parsed.product_name || "";
    } catch (e) {
      productName = raw.trim();
    }

    if (!productName) {
      return res.status(500).json({
        error: "Could not identify product",
      });
    }

    // =========================
    // 3. SERPAPI REQUEST
    // =========================
    const serpRes = await fetch(
      `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
        productName
      )}&gl=in&hl=en&google_domain=google.co.in&api_key=${
        process.env.SERPAPI_KEY
      }`
    );

    const serpText = await serpRes.text();

    let serpData = {};
    try {
      serpData = serpText ? JSON.parse(serpText) : {};
    } catch (e) {
      return res.status(500).json({
        error: "Invalid SerpAPI response",
      });
    }

    const results = serpData.shopping_results || [];

    const first =
      results.find((p) => p.price) || results[0];

    // =========================
    // 4. HELPERS
    // =========================
    function cleanUrl(url) {
      if (!url) return "#";
      try {
        const u = new URL(url);
        u.search = "";
        return u.toString();
      } catch {
        return url;
      }
    }

    function cleanPrice(price) {
      if (!price) return "N/A";
      return price.replace(/[^\d₹$€,.]/g, "").trim();
    }

    // =========================
    // 5. FILTER ALTERNATIVES
    // =========================
    const filtered = results.filter((item) =>
      item.title
        ?.toLowerCase()
        .includes(productName.toLowerCase().split(" ")[0])
    );

    // =========================
    // 6. RESPONSE
    // =========================
    const productData = {
      product_name: first?.title || productName,
      description:
        first?.snippet || "Product identified by ShopLens AI",
      price: cleanPrice(first?.price),
      image: first?.thumbnail || "",
      buy_url: cleanUrl(first?.product_link || first?.link),
      store: first?.source || "Unknown Store",
      rating: first?.rating || "N/A",
      reviews: first?.reviews || "N/A",

      safety_score: 97,
      sales_trend: "High",
      match_score: first?.price ? 95 : 80,

      alternatives: filtered.slice(0, 5).map((item) => ({
        title: item.title,
        price: cleanPrice(item.price),
        image: item.thumbnail,
        link: cleanUrl(item.product_link || item.link),
      })),
    };

    return res.status(200).json(productData);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
}

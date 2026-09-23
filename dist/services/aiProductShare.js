import { prisma } from "../lib/prisma.js";
import { openrouter } from "../lib/openrouter.js";
const parseAIResponse = (rawContent) => {
    let content = "";
    if (typeof rawContent === "string") {
        content = rawContent;
    }
    else if (Array.isArray(rawContent)) {
        content = rawContent
            .map((item) => {
            if (typeof item === "string") {
                return item;
            }
            if (item &&
                typeof item === "object" &&
                "text" in item &&
                typeof item.text === "string") {
                return item.text;
            }
            return "";
        })
            .join(" ");
    }
    else if (rawContent && typeof rawContent === "object") {
        content = JSON.stringify(rawContent);
    }
    const cleanedContent = content
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("AI returned an invalid response.");
    }
    let parsed;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    }
    catch {
        throw new Error("Failed to parse AI response.");
    }
    if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid AI response format.");
    }
    const data = parsed;
    const hook = typeof data.hook === "string"
        ? data.hook.trim()
        : "";
    const caption = typeof data.caption === "string"
        ? data.caption.trim()
        : "";
    const hashtags = Array.isArray(data.hashtags)
        ? data.hashtags
            .filter((item) => typeof item === "string")
            .map((item) => {
            const hashtag = item.trim();
            if (!hashtag) {
                return "";
            }
            return hashtag.startsWith("#")
                ? hashtag
                : `#${hashtag.replace(/^#+/, "")}`;
        })
            .filter(Boolean)
            .slice(0, 12)
        : [];
    if (!hook || !caption || hashtags.length === 0) {
        throw new Error("AI did not generate complete share content.");
    }
    return {
        hook,
        caption,
        hashtags,
    };
};
export const generateProductShareContent = async (productId, sellerId) => {
    /*
     * =========================================================
     * FIND PRODUCT
     * =========================================================
     */
    const product = await prisma.product.findUnique({
        where: {
            id: productId,
        },
        select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            brand: true,
            shortDescription: true,
            description: true,
            regularPrice: true,
            salePrice: true,
            stockQuantity: true,
            stockStatus: true,
            status: true,
            sellerId: true,
        },
    });
    if (!product) {
        throw new Error("Product not found.");
    }
    /*
     * =========================================================
     * SELLER OWNERSHIP CHECK
     * =========================================================
     */
    if (product.sellerId !== sellerId) {
        throw new Error("You do not have permission to generate content for this product.");
    }
    /*
     * =========================================================
     * PRODUCT DATA
     * =========================================================
     */
    const currentPrice = product.salePrice !== null &&
        product.salePrice > 0
        ? product.salePrice
        : product.regularPrice;
    const productContext = `
Product Name: ${product.name}

SKU: ${product.sku}

Category: ${product.category}

Brand: ${product.brand || "N/A"}

Regular Price: ${product.regularPrice}

Sale Price: ${product.salePrice !== null
        ? product.salePrice
        : "Not available"}

Current Price: ${currentPrice}

Stock Quantity: ${product.stockQuantity}

Stock Status: ${product.stockStatus}

Short Description: ${product.shortDescription || "N/A"}

Description: ${product.description || "N/A"}
`;
    /*
     * =========================================================
     * AI REQUEST
     * =========================================================
     */
    const response = await openrouter.chat.send({
        chatRequest: {
            model: "google/gemini-2.5-flash",
            temperature: 0.8,
            max_tokens: 700,
            messages: [
                {
                    role: "system",
                    content: `
You are Shopora's AI Product Marketing Assistant.

Your job is to create social-media-ready promotional content
for a product.

Return ONLY valid JSON.

Required format:

{
  "hook": "short attention-grabbing hook",
  "caption": "engaging social media caption",
  "hashtags": [
    "#hashtag1",
    "#hashtag2",
    "#hashtag3"
  ]
}

Rules:

1. Use ONLY the product information provided.
2. Never invent product features.
3. Never invent product specifications.
4. Never invent discounts.
5. Never invent prices.
6. Never claim something is in stock unless the provided stock data supports it.
7. The hook should be short, catchy, and attention-grabbing.
8. The caption should sound natural and suitable for social media.
9. Keep the caption concise but persuasive.
10. Generate 8-12 relevant hashtags.
11. Hashtags should be relevant to the product, category, brand,
    style, shopping intent, and social media discovery.
12. Do not use random unrelated hashtags.
13. Do not include markdown.
14. Do not include explanations outside the JSON.
15. Do not include the product URL. The application will add it separately.
16. Do not mention that you are an AI.
17. Do not use fake claims such as "best in the world",
    "guaranteed", or "viral".
          `,
                },
                {
                    role: "user",
                    content: `
Create social media share content for this Shopora product:

${productContext}
          `,
                },
            ],
            stream: false,
        },
    });
    /*
     * =========================================================
     * PARSE AI RESPONSE
     * =========================================================
     */
    const rawContent = response?.choices?.[0]?.message?.content;
    return parseAIResponse(rawContent);
};

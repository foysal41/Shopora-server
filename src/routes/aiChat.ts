import { Router } from "express";
import { openrouter } from "../lib/openrouter.js";
import { searchProducts } from "../services/search.js";

const router = Router();

/* =========================================================
   AI RESPONSE HELPER
========================================================= */

const getAIResponse = async (
  systemPrompt: string,
  userPrompt: string
) => {
  const response = await openrouter.chat.send({
    chatRequest: {
      model: "openrouter/free",

      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],

      stream: false,
    },
  });

  const completion = response as any;

  return (
    completion.choices?.[0]?.message?.content || ""
  );
};

/* =========================================================
   CHAT
========================================================= */

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // console.log("AI CHAT MESSAGE:", message);

    /* =====================================================
       STEP 1
       AI UNDERSTANDS CUSTOMER MESSAGE
    ===================================================== */

    const queryResponse = await getAIResponse(
      `
You are a product search query analyzer for Shopora.

Your job is to understand the customer's message.

Return ONLY valid JSON.

Format:

{
  "needsProductSearch": true,
  "searchQuery": "T-WOLF H150"
}

Rules:
- If the customer is asking about finding, checking, buying,
  recommending, or looking for a product, set needsProductSearch to true.
- Extract only the important product-related keywords.
- Remove conversational words such as:
  "do you have", "can you show me", "I need", "I'm looking for",
  "please", etc.
- Do not invent product names.
- If the customer is not asking about a product, set
  needsProductSearch to false.
- When needsProductSearch is false, use an empty searchQuery.
      `,
      message
    );

    // console.log(
    //   "AI QUERY RESPONSE:",
    //   queryResponse
    // );

    /* =====================================================
       PARSE SEARCH QUERY
    ===================================================== */

    let searchInfo: {
      needsProductSearch: boolean;
      searchQuery: string;
    };

    try {
  const cleanedResponse = queryResponse
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  // Find JSON object inside AI response
  const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("No JSON object found in AI response.");
  }

  searchInfo = JSON.parse(jsonMatch[0]);
} catch (error) {
  console.error(
    "AI QUERY PARSE ERROR:",
    error
  );

  searchInfo = {
  needsProductSearch: true,
  searchQuery: message
    .replace(/^do you have\s+/i, "")
    .replace(/^can you show me\s+/i, "")
    .replace(/^can you find\s+/i, "")
    .replace(/^i need\s+/i, "")
    .replace(/^i'm looking for\s+/i, "")
    .replace(/^i am looking for\s+/i, "")
    .replace(/^show me\s+/i, "")
    .replace(/^find me\s+/i, "")
    .replace(/\?+$/, "")
    .trim(),
};
}

    // console.log(
    //   "AI SEARCH INFO:",
    //   searchInfo
    // );

    /* =====================================================
       NORMAL CHAT
       If product search is not needed
    ===================================================== */

    if (!searchInfo.needsProductSearch) {
      const normalResponse = await getAIResponse(
        `
You are Shopora Assistant, a helpful and friendly AI shopping assistant.

Answer the customer's question naturally and concisely.

Do not invent Shopora product information.
        `,
        message
      );

      return res.status(200).json({
        success: true,
        message:
          normalResponse ||
          "Sorry, I could not generate a response.",
      });
    }

    /* =====================================================
       SEARCH SHOPORA DATABASE
    ===================================================== */

    const searchQuery =
      searchInfo.searchQuery.trim();

    // console.log( "SHOPORA PRODUCT SEARCH QUERY:", searchQuery );

    const products = await searchProducts(
      searchQuery
    );

    // console.log(
    //   "PRODUCTS FOUND:",
    //   products.length
    // );

    /* =====================================================
       NO PRODUCT FOUND
    ===================================================== */

    if (!products.length) {
      return res.status(200).json({
        success: true,
        message:
          "I couldn't find any products matching your request.",
      });
    }

    /* =====================================================
       BUILD REAL PRODUCT CONTEXT
    ===================================================== */

    const productContext = products
      .map(
        (product) => `
Product ID: ${product.id}
Name: ${product.name}
SKU: ${product.sku}
Brand: ${product.brand || "N/A"}
Category: ${product.category}

Regular Price: $${product.regularPrice}

Sale Price: ${
          product.salePrice
            ? `$${product.salePrice}`
            : "Not available"
        }

Stock Quantity: ${product.stockQuantity}
Stock Status: ${product.stockStatus}

Short Description: ${
          product.shortDescription || "N/A"
        }

Description: ${
          product.description || "N/A"
        }
`
      )
      .join(
        "\n-----------------------------\n"
      );

    // console.log(
    //   "PRODUCT CONTEXT:",
    //   productContext
    // );

    /* =====================================================
       AI FINAL RESPONSE
    ===================================================== */

    const finalResponse = await getAIResponse(
      `
You are Shopora Assistant, a helpful and friendly AI shopping assistant.

You are given REAL product information from the Shopora database.

IMPORTANT RULES:

1. Only use the provided product information.
2. Never invent product names.
3. Never invent prices.
4. Never invent stock quantities.
5. Never invent brands.
6. Use the sale price when available.
7. If stockQuantity is 0, clearly say the product is out of stock.
8. Answer the customer's actual question.
9. Keep the response concise and natural.
10. Do not mention that you are using a database.
      `,
      `
Customer question:

${message}

REAL SHOPORA PRODUCT DATA:

${productContext}
      `
    );

    return res.status(200).json({
      success: true,
      message:
        finalResponse ||
        "Sorry, I could not generate a response.",
    });
  } catch (error: any) {
    console.error(
      "AI CHAT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "AI request failed",
    });
  }
});

export default router;
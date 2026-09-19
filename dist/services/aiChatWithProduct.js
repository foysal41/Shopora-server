import { searchProducts } from "./search.js";
/* =========================================================
   PRODUCT SEARCH
========================================================= */
const findProducts = async (message) => {
    try {
        const products = await searchProducts(message);
        return products;
    }
    catch (error) {
        console.error("AI PRODUCT SEARCH ERROR:", error);
        throw new Error("Failed to search products.");
    }
};
/* =========================================================
   PRODUCT CONTEXT BUILDER
========================================================= */
const buildProductContext = (products) => {
    if (!products.length) {
        return "No matching products were found.";
    }
    return products
        .map((product) => `
Product ID: ${product.id}
Name: ${product.name}
SKU: ${product.sku}
Brand: ${product.brand || "N/A"}
Category: ${product.category}

Price: $${product.salePrice && product.salePrice > 0
        ? product.salePrice
        : product.regularPrice}

Regular Price: $${product.regularPrice}
Sale Price: ${product.salePrice
        ? `$${product.salePrice}`
        : "Not available"}

Stock Quantity: ${product.stockQuantity}
Stock Status: ${product.stockStatus}

Short Description: ${product.shortDescription || "N/A"}

Description: ${product.description || "N/A"}
`)
        .join("\n-----------------------------\n");
};
/* =========================================================
   CHAT WITH PRODUCTS
========================================================= */
export const chatWithProducts = async (userMessage) => {
    const message = userMessage.trim();
    if (!message) {
        throw new Error("Message is required.");
    }
    /* -------------------------------------------------------
       SEARCH PRODUCTS
    ------------------------------------------------------- */
    const products = await findProducts(message);
    /* -------------------------------------------------------
       BUILD PRODUCT CONTEXT
    ------------------------------------------------------- */
    const productContext = buildProductContext(products);
    /* -------------------------------------------------------
       DEBUG LOG
    ------------------------------------------------------- */
    console.log("AI PRODUCT SEARCH:", {
        userMessage: message,
        productsFound: products.length,
    });
    console.log("PRODUCT CONTEXT:", productContext);
    /* -------------------------------------------------------
       TEMPORARY RESPONSE
    ------------------------------------------------------- */
    if (!products.length) {
        return {
            message: "I couldn't find any products matching your request.",
            products: [],
        };
    }
    return {
        message: `I found ${products.length} product${products.length > 1 ? "s" : ""} that may match your request.`,
        products,
    };
};

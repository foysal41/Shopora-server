const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const sendChatRequest = async (chatRequest) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is not configured");
    }
    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(chatRequest),
    });
    const data = await response.json();
    if (!response.ok) {
        console.error("OPENROUTER API ERROR:", data);
        throw new Error(data?.error?.message || "OpenRouter request failed");
    }
    return data;
};
const parseOpenRouterContent = (content) => {
    if (typeof content === "string")
        return content;
    if (Array.isArray(content)) {
        return content
            .map((part) => {
            if (typeof part === "string")
                return part;
            if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
                return part.text;
            }
            return "";
        })
            .join(" ");
    }
    if (content && typeof content === "object") {
        return JSON.stringify(content);
    }
    return "";
};
export const openrouter = {
    chat: {
        send: async ({ chatRequest, }) => {
            return await sendChatRequest(chatRequest);
        },
    },
    vision: {
        analyzeImage: async ({ imageBuffer, mimeType, }) => {
            const dataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
            const response = await sendChatRequest({
                model: "google/gemini-2.5-flash",
                temperature: 0.1,
                max_tokens: 250,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Analyze this product image and return ONLY valid JSON with keys: productType, keywords, color, style, material. Use concise array values. Example: {\"productType\":\"shoe\",\"keywords\":[\"sneaker\",\"sport\",\"white\"],\"color\":\"white\",\"style\":\"sporty\",\"material\":\"fabric\"}",
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: dataUrl,
                                },
                            },
                        ],
                    },
                ],
            });
            const rawContent = parseOpenRouterContent(response?.choices?.[0]?.message?.content);
            const jsonText = rawContent
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();
            const match = jsonText.match(/\{[\s\S]*\}/);
            const payload = match ? JSON.parse(match[0]) : null;
            if (!payload || typeof payload !== "object") {
                return {
                    productType: "",
                    keywords: [],
                    color: "",
                    style: "",
                    material: "",
                };
            }
            return {
                productType: typeof payload.productType === "string" ? payload.productType : "",
                keywords: Array.isArray(payload.keywords) ? payload.keywords.filter((item) => typeof item === "string") : [],
                color: typeof payload.color === "string" ? payload.color : "",
                style: typeof payload.style === "string" ? payload.style : "",
                material: typeof payload.material === "string" ? payload.material : "",
            };
        },
    },
};

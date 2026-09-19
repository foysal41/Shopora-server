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
export const openrouter = {
    chat: {
        send: async ({ chatRequest, }) => {
            return await sendChatRequest(chatRequest);
        },
    },
};

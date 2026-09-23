const APIFY_ACTOR_URL = "https://api.apify.com/v2/actors/vortex_data~google-maps/run-sync-get-dataset-items";
const getApifyToken = () => {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        throw new Error("APIFY_API_TOKEN is not configured");
    }
    return token;
};
export const searchBusinessLeads = async (input) => {
    const token = getApifyToken();
    const { searchStringsArray, locationQueries, maxCrawledPlacesPerSearch, extractContactsFromWebsite = true, } = input;
    const actorInput = {
        searchStringsArray,
        locationQueries,
        maxCrawledPlacesPerSearch,
        extractContactsFromWebsite,
    };
    console.log("BUSINESS LEADS APIFY INPUT:", JSON.stringify(actorInput, null, 2));
    const response = await fetch(`${APIFY_ACTOR_URL}?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(actorInput),
    });
    if (!response.ok) {
        let errorMessage = "Apify business leads request failed";
        try {
            const errorData = await response.json();
            errorMessage =
                errorData?.error?.message ||
                    errorData?.message ||
                    errorMessage;
        }
        catch {
            // Ignore JSON parsing error
        }
        console.error("APIFY BUSINESS LEADS ERROR:", response.status, errorMessage);
        throw new Error(errorMessage);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
        console.error("INVALID APIFY BUSINESS LEADS RESPONSE:", data);
        throw new Error("Invalid response received from Apify");
    }
    return data;
};

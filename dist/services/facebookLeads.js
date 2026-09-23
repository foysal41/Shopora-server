const APIFY_API_URL = "https://api.apify.com/v2/actors/memo23~facebook-search-scraper/run-sync-get-dataset-items";
const ALLOWED_SEARCH_TYPES = new Set([
    "people",
    "pages",
    "places",
    "events",
    "posts",
    "videos",
    "top",
]);
export const searchFacebookLeads = async (input) => {
    const apiToken = process.env.APIFY_API_TOKEN;
    if (!apiToken) {
        throw new Error("APIFY_API_TOKEN is not configured");
    }
    if (!input.searchQueries?.length) {
        throw new Error("At least one search query is required.");
    }
    if (!ALLOWED_SEARCH_TYPES.has(input.searchType)) {
        throw new Error("Invalid Facebook search type.");
    }
    const maxItems = Math.min(Math.max(input.maxItems || 20, 1), 200);
    const actorInput = {
        searchType: input.searchType,
        searchQueries: input.searchQueries
            .map((query) => query.trim())
            .filter(Boolean),
        maxItems,
    };
    /*
     * memo23 actor expects locationUid,
     * not a normal city name.
     *
     * Example:
     * 106078429431815
     *
     * or:
     * https://www.facebook.com/places/106078429431815/
     */
    if (input.locationUid?.trim()) {
        actorInput.locationUid =
            input.locationUid.trim();
    }
    console.log("======================================");
    console.log("FACEBOOK LEAD APIFY INPUT:", JSON.stringify(actorInput, null, 2));
    console.log("======================================");
    const response = await fetch(`${APIFY_API_URL}?token=${encodeURIComponent(apiToken)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(actorInput),
    });
    const responseText = await response.text();
    if (!response.ok) {
        console.error("APIFY FACEBOOK LEAD ERROR:", responseText);
        let message = "Failed to search Facebook leads.";
        try {
            const errorData = JSON.parse(responseText);
            message =
                errorData?.error?.message ||
                    errorData?.message ||
                    message;
        }
        catch {
            // Keep default message
        }
        throw new Error(message);
    }
    let data;
    try {
        data = JSON.parse(responseText);
    }
    catch {
        console.error("APIFY INVALID JSON RESPONSE:", responseText);
        throw new Error("Apify returned an invalid response.");
    }
    if (!Array.isArray(data)) {
        console.error("APIFY UNEXPECTED DATA:", data);
        throw new Error("Apify returned an unexpected dataset.");
    }
    return data;
};

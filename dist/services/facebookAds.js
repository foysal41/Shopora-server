const APIFY_ACTOR_ID = "apify~facebook-ads-scraper";
export const scrapeFacebookAds = async (input) => {
    const apiToken = process.env.APIFY_API_TOKEN;
    if (!apiToken) {
        throw new Error("APIFY_API_TOKEN is not configured");
    }
    const response = await fetch(`https://api.apify.com/v2/actors/${APIFY_ACTOR_ID}/run-sync-get-dataset-items`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            startUrls: [
                {
                    url: input.url,
                },
            ],
            resultsLimit: input.resultsLimit,
            activeStatus: input.activeStatus,
            includeAboutPage: input.includeAboutPage,
            isDetailsPerAd: input.isDetailsPerAd,
            onlyTotal: false,
        }),
    });
    const responseText = await response.text();
    if (!response.ok) {
        console.error("APIFY ERROR:", response.status, responseText);
        throw new Error(`Apify request failed: ${responseText.slice(0, 500)}`);
    }
    let data;
    try {
        data = JSON.parse(responseText);
    }
    catch {
        console.error("APIFY INVALID JSON:", responseText);
        throw new Error("Apify returned invalid JSON");
    }
    if (!Array.isArray(data)) {
        console.error("APIFY UNEXPECTED RESPONSE:", data);
        throw new Error("Apify returned an unexpected response");
    }
    return data;
};

import { openrouter } from "../lib/openrouter.js";
/* =========================================================
   APIFY
========================================================= */
const APIFY_ACTOR_URL = "https://api.apify.com/v2/acts/coregent~facebook-posts-scraper/run-sync-get-dataset-items";
/* =========================================================
   APIFY TOKEN
========================================================= */
const getApifyToken = () => {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        throw new Error("APIFY_API_TOKEN is not configured");
    }
    return token;
};
/* =========================================================
   SEARCH QUERY BUILDER
========================================================= */
const buildSearchQueries = (productQuery, searchQueries) => {
    const query = productQuery.trim();
    const defaultQueries = [
        query,
        `${query} review`,
        `${query} experience`,
        `${query} problem`,
        `${query} worth it`,
    ];
    const customQueries = Array.isArray(searchQueries)
        ? searchQueries
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : [];
    return Array.from(new Set([
        ...defaultQueries,
        ...customQueries,
    ])).slice(0, 10);
};
/* =========================================================
   FETCH FACEBOOK POSTS
========================================================= */
const fetchFacebookPosts = async (input) => {
    const token = getApifyToken();
    const searchQueries = buildSearchQueries(input.productQuery, input.searchQueries);
    const actorInput = {
        searchQueries,
        maxResults: Math.min(Math.max(input.maxResults ?? 50, 1), 500),
        proxyConfiguration: {
            useApifyProxy: true,
        },
    };
    if (input.location &&
        input.location.trim()) {
        actorInput.locations = [
            input.location.trim(),
        ];
    }
    if (input.dateFrom) {
        actorInput.dateFrom =
            input.dateFrom;
    }
    if (input.dateTo) {
        actorInput.dateTo =
            input.dateTo;
    }
    if (typeof input.minReactions ===
        "number") {
        actorInput.minReactions =
            input.minReactions;
    }
    if (typeof input.minComments ===
        "number") {
        actorInput.minComments =
            input.minComments;
    }
    if (typeof input.minShares ===
        "number") {
        actorInput.minShares =
            input.minShares;
    }
    console.log("PRODUCT INSIGHTS - APIFY INPUT:", JSON.stringify(actorInput, null, 2));
    const response = await fetch(`${APIFY_ACTOR_URL}?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(actorInput),
    });
    if (!response.ok) {
        let errorMessage = "Facebook post scraper request failed.";
        try {
            const errorData = await response.json();
            if (errorData &&
                typeof errorData ===
                    "object") {
                const data = errorData;
                if (typeof data.error
                    ?.message ===
                    "string") {
                    errorMessage =
                        data.error.message;
                }
                else if (typeof data.message ===
                    "string") {
                    errorMessage =
                        data.message;
                }
            }
        }
        catch {
            // Ignore invalid JSON
        }
        console.error("FACEBOOK SCRAPER ERROR:", response.status, errorMessage);
        throw new Error(errorMessage);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
        console.error("INVALID FACEBOOK SCRAPER RESPONSE:", data);
        throw new Error("Invalid Facebook scraper response.");
    }
    return data;
};
/* =========================================================
   NORMALIZE POSTS
========================================================= */
const normalizePosts = (posts) => {
    const seenPostIds = new Set();
    const normalizedPosts = [];
    for (const post of posts) {
        const postId = typeof post.postId ===
            "string"
            ? post.postId.trim()
            : "";
        const postUrl = typeof post.postUrl ===
            "string"
            ? post.postUrl.trim()
            : typeof post.permalink ===
                "string"
                ? post.permalink.trim()
                : "";
        const text = typeof post.text ===
            "string"
            ? post.text.trim()
            : "";
        if (!postId ||
            !postUrl ||
            !text) {
            continue;
        }
        if (seenPostIds.has(postId)) {
            continue;
        }
        seenPostIds.add(postId);
        const engagement = post.engagement ?? {};
        normalizedPosts.push({
            postId,
            postUrl,
            author: post.author?.name ??
                "Unknown Facebook User",
            publishedAt: typeof post.publishedAt ===
                "string"
                ? post.publishedAt
                : null,
            text,
            sentiment: "neutral",
            reactions: typeof engagement.reactions ===
                "number"
                ? engagement.reactions
                : 0,
            comments: typeof engagement.comments ===
                "number"
                ? engagement.comments
                : 0,
            shares: typeof engagement.shares ===
                "number"
                ? engagement.shares
                : 0,
            reactionBreakdown: engagement.reactionBreakdown ??
                {},
            keyword: post.source?.query ??
                null,
        });
    }
    return normalizedPosts;
};
/* =========================================================
   OPENROUTER CONTENT
========================================================= */
const getContentText = (content) => {
    if (typeof content ===
        "string") {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .map((item) => {
            if (typeof item ===
                "string") {
                return item;
            }
            if (item &&
                typeof item ===
                    "object" &&
                "text" in item) {
                const text = item.text;
                return typeof text ===
                    "string"
                    ? text
                    : "";
            }
            return "";
        })
            .join(" ");
    }
    return "";
};
/* =========================================================
   PARSE AI JSON
========================================================= */
const parseAiJson = (content) => {
    const text = getContentText(content)
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error("AI returned invalid JSON.");
    }
    const parsed = JSON.parse(match[0]);
    if (!parsed ||
        typeof parsed !==
            "object" ||
        Array.isArray(parsed)) {
        throw new Error("AI returned invalid analysis.");
    }
    return parsed;
};
/* =========================================================
   STRING ARRAY HELPER
========================================================= */
const getStringArray = (value, maxItems) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .filter((item) => typeof item ===
        "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, maxItems);
};
/* =========================================================
   SENTIMENT TYPE
========================================================= */
const isSentiment = (value) => {
    return (value === "positive" ||
        value === "negative" ||
        value === "neutral");
};
/* =========================================================
   AI ANALYSIS
========================================================= */
const analyzePostsWithAI = async (posts, productQuery) => {
    if (!posts.length) {
        return {
            overallSentiment: {
                positive: 0,
                neutral: 0,
                negative: 0,
            },
            commonPositiveFeedback: [],
            commonNegativeFeedback: [],
            customerQuestions: [],
            keyInsights: [],
            analyzedPosts: [],
        };
    }
    /*
     * Send max 100 posts to AI.
     * Actor can return more, but this keeps
     * AI token usage under control.
     */
    const aiPosts = posts
        .slice(0, 100)
        .map((post) => ({
        postId: post.postId,
        text: post.text.slice(0, 2000),
        reactions: post.reactions,
        comments: post.comments,
        shares: post.shares,
    }));
    const prompt = `
You are a product market research analyst.

PRODUCT:
${productQuery}

Analyze the following PUBLIC Facebook post texts.

IMPORTANT RULES:

1. Analyze ONLY the supplied post text.
2. Do not invent information.
3. Do not claim that you read Facebook comments.
4. "comments" is only a numeric comment count.
5. Customer questions must come ONLY from explicit questions in the post text.
6. Sentiment must be exactly:
   - positive
   - negative
   - neutral
7. If sentiment is unclear, use neutral.
8. Every supplied postId MUST appear in analyzedPosts.
9. Return ONLY valid JSON.
10. Do not return markdown.

Return:

{
  "commonPositiveFeedback": [],
  "commonNegativeFeedback": [],
  "customerQuestions": [],
  "keyInsights": [],
  "analyzedPosts": [
    {
      "postId": "string",
      "sentiment": "positive"
    }
  ]
}

Rules for arrays:

commonPositiveFeedback:
Maximum 7 concise themes.

commonNegativeFeedback:
Maximum 7 concise themes.

customerQuestions:
Maximum 10 actual questions found in the post text.

keyInsights:
Maximum 7 concise insights.

POST DATA:
${JSON.stringify(aiPosts)}
`;
    const response = await openrouter.chat.send({
        chatRequest: {
            model: process.env
                .OPENROUTER_MODEL ??
                "google/gemini-2.5-flash",
            temperature: 0.1,
            max_tokens: 5000,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        },
    });
    const content = response?.choices?.[0]
        ?.message?.content;
    const parsed = parseAiJson(content);
    const rawAnalyzed = Array.isArray(parsed.analyzedPosts)
        ? parsed.analyzedPosts
        : [];
    const analyzedPosts = [];
    for (const item of rawAnalyzed) {
        if (!item ||
            typeof item !==
                "object") {
            continue;
        }
        const record = item;
        const postId = typeof record.postId ===
            "string"
            ? record.postId
            : "";
        const sentiment = record.sentiment;
        if (!postId ||
            !isSentiment(sentiment)) {
            continue;
        }
        analyzedPosts.push({
            postId,
            sentiment,
        });
    }
    /*
     * Guarantee every post has a sentiment.
     * If AI misses one, use neutral.
     */
    const sentimentMap = new Map();
    for (const item of analyzedPosts) {
        sentimentMap.set(item.postId, item.sentiment);
    }
    const completeAnalyzedPosts = posts
        .slice(0, 100)
        .map((post) => ({
        postId: post.postId,
        sentiment: sentimentMap.get(post.postId) ?? "neutral",
    }));
    /*
     * Calculate percentages ourselves.
     */
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    for (const item of completeAnalyzedPosts) {
        if (item.sentiment ===
            "positive") {
            positive++;
        }
        else if (item.sentiment ===
            "negative") {
            negative++;
        }
        else {
            neutral++;
        }
    }
    const total = completeAnalyzedPosts.length;
    const percentage = (value) => {
        if (!total) {
            return 0;
        }
        return Math.round((value / total) * 100);
    };
    return {
        overallSentiment: {
            positive: percentage(positive),
            neutral: percentage(neutral),
            negative: percentage(negative),
        },
        commonPositiveFeedback: getStringArray(parsed.commonPositiveFeedback, 7),
        commonNegativeFeedback: getStringArray(parsed.commonNegativeFeedback, 7),
        customerQuestions: getStringArray(parsed.customerQuestions, 10),
        keyInsights: getStringArray(parsed.keyInsights, 7),
        analyzedPosts: completeAnalyzedPosts,
    };
};
/* =========================================================
   MAIN FUNCTION
========================================================= */
export const analyzeProductInsights = async (input) => {
    const productQuery = input.productQuery.trim();
    if (!productQuery) {
        throw new Error("Product query is required.");
    }
    const searchQueries = buildSearchQueries(productQuery, input.searchQueries);
    console.log("PRODUCT INSIGHTS SEARCH:", {
        productQuery,
        searchQueries,
        location: input.location ??
            null,
    });
    /*
     * 1. Fetch Facebook posts
     */
    const rawPosts = await fetchFacebookPosts({
        ...input,
        productQuery,
        searchQueries,
    });
    /*
     * 2. Normalize
     */
    const posts = normalizePosts(rawPosts);
    console.log("FACEBOOK POSTS FOUND:", posts.length);
    /*
     * 3. AI analysis
     */
    const analysis = await analyzePostsWithAI(posts, productQuery);
    /*
     * 4. Merge sentiment
     */
    const sentimentMap = new Map();
    for (const item of analysis.analyzedPosts) {
        sentimentMap.set(item.postId, item.sentiment);
    }
    const finalPosts = posts.map((post) => ({
        ...post,
        sentiment: sentimentMap.get(post.postId) ?? "neutral",
    }));
    return {
        productQuery,
        searchQueries,
        totalPosts: finalPosts.length,
        analysis: {
            ...analysis,
            analyzedPosts: finalPosts.map((post) => ({
                postId: post.postId,
                sentiment: post.sentiment,
            })),
        },
        posts: finalPosts,
    };
};

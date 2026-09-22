import type {
  InstagramEmailScraperInput,
  InstagramEmailLead,
} from "../types/instagramEmailScraper.js";

const APIFY_ACTOR_URL =
  "https://api.apify.com/v2/acts/2Gf0ILLIvD0eLZulg/run-sync-get-dataset-items";

const getApifyToken = (): string => {
  const token = process.env.APIFY_API_TOKEN;

  if (!token) {
    throw new Error(
      "APIFY_API_TOKEN is not configured"
    );
  }

  return token;
};

export const searchInstagramEmails = async (
  input: InstagramEmailScraperInput
): Promise<InstagramEmailLead[]> => {
  const token = getApifyToken();

  const {
    keywords,
    location,
    customDomains,
    maxEmails = 10,
    excludeWords = [],
  } = input;

  const actorInput = {
    keywords,
    ...(location?.trim()
      ? {
          location: location.trim(),
        }
      : {}),
    ...(customDomains?.length
      ? {
          customDomains,
        }
      : {}),
    maxEmails,
    ...(excludeWords.length
      ? {
          excludeWords,
        }
      : {}),
  };

  console.log(
    "INSTAGRAM EMAIL SCRAPER INPUT:",
    JSON.stringify(
      actorInput,
      null,
      2
    )
  );

  const response = await fetch(
    `${APIFY_ACTOR_URL}?token=${encodeURIComponent(
      token
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(actorInput),
    }
  );

  if (!response.ok) {
    let errorMessage =
      "Instagram email scraper request failed";

    try {
      const errorData =
        await response.json();

      errorMessage =
        errorData?.error?.message ||
        errorData?.message ||
        errorMessage;
    } catch {
      // Ignore response parsing errors
    }

    console.error(
      "APIFY INSTAGRAM EMAIL SCRAPER ERROR:",
      response.status,
      errorMessage
    );

    throw new Error(errorMessage);
  }

  const data =
    await response.json();

  if (!Array.isArray(data)) {
    console.error(
      "INVALID INSTAGRAM EMAIL SCRAPER RESPONSE:",
      data
    );

    throw new Error(
      "Invalid response received from Instagram email scraper"
    );
  }

  return data as InstagramEmailLead[];
};
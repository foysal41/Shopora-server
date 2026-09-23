import {
  InfluencerProfile,
  InfluencerScraperInput,
} from "../types/influencerScraper.js";

const APIFY_BASE_URL = "https://api.apify.com/v2";

const APIFY_ACTOR_ID =
  "maximedupre~influencer-scraper";

function getApifyToken(): string {
  const token = process.env.APIFY_API_TOKEN;

  if (!token) {
    throw new Error(
      "APIFY_API_TOKEN is not configured."
    );
  }

  return token;
}

/**
 * Convert Apify Actor output into only the fields
 * that our frontend actually needs.
 */
function normalizeProfile(
  item: Record<string, any>
): InfluencerProfile {
  return {
    inputTarget:
      typeof item.inputTarget === "string"
        ? item.inputTarget
        : "",

    platform:
      typeof item.platform === "string"
        ? item.platform
        : "",

    username:
      typeof item.username === "string"
        ? item.username
        : undefined,

    handle:
      typeof item.handle === "string"
        ? item.handle
        : undefined,

    displayName:
      typeof item.displayName === "string"
        ? item.displayName
        : undefined,

    profileUrl:
      typeof item.profileUrl === "string"
        ? item.profileUrl
        : undefined,

    bio:
      typeof item.bio === "string"
        ? item.bio
        : undefined,

    avatarUrl:
      typeof item.avatarUrl === "string"
        ? item.avatarUrl
        : undefined,

    followerCount:
      typeof item.followerCount === "number"
        ? item.followerCount
        : undefined,

    followingCount:
      typeof item.followingCount === "number"
        ? item.followingCount
        : undefined,

    postCount:
      typeof item.postCount === "number"
        ? item.postCount
        : undefined,

    engagementRate:
      typeof item.engagementRate === "number"
        ? item.engagementRate
        : undefined,

    isVerified:
      typeof item.isVerified === "boolean"
        ? item.isVerified
        : undefined,
  };
}

export async function startInfluencerScraper(
  input: InfluencerScraperInput
) {
  const token = getApifyToken();

  const actorInput = {
    targets: input.targets,
    platforms: input.platforms,
    sortBy: input.sortBy ?? "relevance",
    maxRecentPostsPerProfile:
      input.maxRecentPostsPerProfile ?? 6,
    maxInfluencersPerTarget:
      input.maxInfluencersPerTarget ?? 10,
  };

  const response = await fetch(
    `${APIFY_BASE_URL}/actors/${APIFY_ACTOR_ID}/runs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(actorInput),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Failed to start Apify Actor: ${errorText}`
    );
  }

  const data = await response.json();

  return {
    runId: data.data.id as string,
    status: data.data.status as string,
    defaultDatasetId:
      data.data.defaultDatasetId as string | undefined,
  };
}

export async function getInfluencerRun(
  runId: string
) {
  const token = getApifyToken();

  const runResponse = await fetch(
    `${APIFY_BASE_URL}/actor-runs/${encodeURIComponent(
      runId
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!runResponse.ok) {
    const errorText = await runResponse.text();

    throw new Error(
      `Failed to get Apify run: ${errorText}`
    );
  }

  const runData = await runResponse.json();

  const run = runData.data;

  let profiles: InfluencerProfile[] = [];

  /**
   * Dataset may not be ready immediately after
   * the Actor starts.
   */
  try {
    const datasetResponse = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${encodeURIComponent(
        runId
      )}/dataset/items?format=json`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (datasetResponse.ok) {
      const datasetItems =
        await datasetResponse.json();

      if (Array.isArray(datasetItems)) {
        profiles = datasetItems.map(
          (item: Record<string, any>) =>
            normalizeProfile(item)
        );
      }
    }
  } catch {
    /**
     * Dataset may temporarily be unavailable
     * while the Actor is starting/stopping.
     */
    profiles = [];
  }

  return {
    run,
    profiles,
  };
}

export function buildInfluencerResult(
  input: InfluencerScraperInput,
  profiles: InfluencerProfile[]
) {
  const uniqueProfiles = new Map<
    string,
    InfluencerProfile
  >();

  for (const profile of profiles) {
    const key = [
      profile.platform,
      profile.profileUrl ??
        profile.username ??
        profile.handle ??
        profile.displayName ??
        Math.random().toString(),
    ].join(":");

    if (!uniqueProfiles.has(key)) {
      uniqueProfiles.set(key, profile);
    }
  }

  const finalProfiles = Array.from(
    uniqueProfiles.values()
  );

  return {
    targets: input.targets,
    platforms: input.platforms,
    sortBy: input.sortBy ?? "relevance",
    totalProfiles: finalProfiles.length,
    profiles: finalProfiles,
  };
}
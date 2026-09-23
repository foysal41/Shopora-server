export type InfluencerPlatform =
  | "tiktok"
  | "instagram"
  | "youtube";

export type InfluencerSortBy =
  | "relevance"
  | "followers"
  | "engagement";

export interface InfluencerScraperInput {
  targets: string[];
  platforms: InfluencerPlatform[];
  sortBy?: InfluencerSortBy;
  maxRecentPostsPerProfile?: number;
  maxInfluencersPerTarget?: number;
}

export interface InfluencerProfile {
  inputTarget: string;
  platform: InfluencerPlatform | string;

  username?: string;
  handle?: string;
  displayName?: string;

  profileUrl?: string;
  bio?: string;
  avatarUrl?: string;

  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  engagementRate?: number;

  isVerified?: boolean;
}

export interface InfluencerScraperResult {
  targets: string[];
  platforms: InfluencerPlatform[];
  sortBy: InfluencerSortBy;
  totalProfiles: number;
  profiles: InfluencerProfile[];
}

export interface StartInfluencerRunResponse {
  success: boolean;
  message?: string;
  runId: string;
  status: string;
}

export interface InfluencerRunStatusResponse {
  success: boolean;
  runId: string;
  status: string;
  partial: boolean;
  profiles: InfluencerProfile[];
  totalProfiles: number;
  message?: string;
}
export type ProductInsightSentiment =
  | "positive"
  | "negative"
  | "neutral";

/* =========================================================
   INPUT
========================================================= */

export interface ProductInsightsInput {
  productQuery: string;
  searchQueries?: string[];
  location?: string;
  maxResults?: number;
  dateFrom?: string;
  dateTo?: string;
  minReactions?: number;
  minComments?: number;
  minShares?: number;
}

/* =========================================================
   FACEBOOK REACTION
========================================================= */

export interface FacebookReactionBreakdown {
  like?: number;
  love?: number;
  care?: number;
  haha?: number;
  wow?: number;
  sad?: number;
  angry?: number;
}

/* =========================================================
   FACEBOOK ENGAGEMENT
========================================================= */

export interface FacebookPostEngagement {
  reactions?: number | null;
  comments?: number | null;
  shares?: number | null;

  reactionBreakdown?: FacebookReactionBreakdown;
}

/* =========================================================
   FACEBOOK AUTHOR
========================================================= */

export interface FacebookPostAuthor {
  id?: string;
  name?: string;
  username?: string;
  url?: string;
  profilePictureUrl?: string;
  isVerified?: boolean;
}

/* =========================================================
   RAW FACEBOOK POST
========================================================= */

export interface FacebookPost {
  recordType?: string;

  postId?: string;

  postUrl?: string;

  permalink?: string;

  author?: FacebookPostAuthor;

  publishedAt?: string;

  text?: string;

  postType?: string;

  engagement?: FacebookPostEngagement;

  externalLinks?: string[];

  media?: unknown[];

  source?: {
    sourceType?: string;
    sourceId?: string;
    sourceUrl?: string;
    inputType?: string;
    query?: string | null;
    queriesMatched?: string[];
    location?: string | null;
    locationsMatched?: string[];
    searchProvider?: string | null;
    detailSource?: string | null;
  };

  [key: string]: unknown;
}

/* =========================================================
   NORMALIZED POST
========================================================= */

export interface ProductInsightPost {
  postId: string;

  postUrl: string;

  author: string;

  publishedAt: string | null;

  text: string;

  sentiment: ProductInsightSentiment;

  reactions: number;

  comments: number;

  shares: number;

  reactionBreakdown: FacebookReactionBreakdown;

  keyword: string | null;
}

/* =========================================================
   AI ANALYSIS
========================================================= */

export interface ProductInsightsAnalysis {
  overallSentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };

  commonPositiveFeedback: string[];

  commonNegativeFeedback: string[];

  customerQuestions: string[];

  keyInsights: string[];

  analyzedPosts: Array<{
    postId: string;
    sentiment: ProductInsightSentiment;
  }>;
}

/* =========================================================
   FINAL RESPONSE
========================================================= */

export interface ProductInsightsResult {
  productQuery: string;

  searchQueries: string[];

  totalPosts: number;

  analysis: ProductInsightsAnalysis;

  posts: ProductInsightPost[];
}

export interface ProductInsightsResponse {
  success: boolean;

  message: string;

  data: ProductInsightsResult;
}
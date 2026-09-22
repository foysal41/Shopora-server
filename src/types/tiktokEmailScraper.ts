export interface TikTokEmailScraperInput {
  keywords: string[];
  location?: string;
  customDomains?: string[];
  maxEmails?: number;
  excludeWords?: string[];
}

export interface TikTokEmailLead {
  network?: string;
  keyword?: string;
  title?: string;
  description?: string;
  url?: string;
  email?: string;

  [key: string]: unknown;
}
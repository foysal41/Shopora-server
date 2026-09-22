export interface InstagramEmailScraperInput {
  keywords: string[];

  location?: string;

  customDomains?: string[];

  maxEmails?: number;

  excludeWords?: string[];
}

export interface InstagramEmailLead {
  email?: string;

  title?: string;

  description?: string;

  url?: string;

  keyword?: string;

  location?: string;

  [key: string]: unknown;
}
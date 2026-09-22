export interface BusinessLeadSearchInput {
  searchStringsArray: string[];
  locationQueries: string[];
  maxCrawledPlacesPerSearch: number;
  extractContactsFromWebsite?: boolean;
}

export interface BusinessLead {
  title?: string;
  categoryName?: string;
  categories?: string[];
  categoryId?: string;
  description?: string;
  subTitle?: string;

  address?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  state?: string;
  countryCode?: string;
  neighborhood?: string;
  plusCode?: string;
  timezone?: string;

  location?: {
    lat?: number;
    lng?: number;
  };

  entranceLocation?: {
    lat?: number;
    lng?: number;
  };

  phone?: string;
  phoneUnformatted?: string;
  website?: string;
  websiteDisplay?: string;

  emails?: string[];
  additionalPhones?: string[];
  whatsapps?: string[];

  facebooks?: string[];
  instagrams?: string[];
  linkedIns?: string[];
  twitters?: string[];
  youtubes?: string[];
  tiktoks?: string[];
  pinterests?: string[];
  tripadvisors?: string[];
  yelps?: string[];
  foursquares?: string[];

  totalScore?: number;
  reviewsCount?: number;
  reviewsUrl?: string;

  openingHoursToday?: unknown;
  currentStatus?: string;
  nextOpensAt?: string;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;

  photos?: unknown[];
  hotels?: unknown;
  commerce?: unknown;
  listing?: unknown;
  identifiers?: unknown;

  placeId?: string;
  url?: string;

  searchString?: string;
  searchTerm?: string;
}
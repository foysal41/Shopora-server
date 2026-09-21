export type FacebookSearchType =
  | "people"
  | "pages"
  | "places"
  | "events"
  | "posts"
  | "videos"
  | "top";

export interface FacebookLeadSearchInput {
  searchType: FacebookSearchType;

  searchQueries: string[];

  /*
   * Facebook Place UID or Facebook place URL.
   *
   * Example:
   * 106078429431815
   *
   * or:
   * https://www.facebook.com/places/106078429431815/
   */
  locationUid?: string;

  maxItems: number;
}
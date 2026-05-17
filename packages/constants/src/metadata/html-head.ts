import { SITE_NAME_AR } from '../brand';
import { OPEN_GRAPH_URL_PATH, TWITTER_SUMMARY_CARD_IMAGE_PATH } from './og-twitter';
import {
  SITE_ARTICLE_SECTION,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_THEME_COLOR_HEX,
  SITE_TITLE,
} from './seo';

export const HTML_HEAD_METADATA = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  openGraphUrl: OPEN_GRAPH_URL_PATH,
  twitterSummaryCardImageUrl: TWITTER_SUMMARY_CARD_IMAGE_PATH,
  poetName: SITE_NAME_AR,
  author: SITE_NAME_AR,
  articleSection: SITE_ARTICLE_SECTION,
  themeColorHexCode: SITE_THEME_COLOR_HEX,
} as const;

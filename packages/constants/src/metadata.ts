import { SITE_NAME_AR } from './brand';

export const SITE_TITLE = 'قافية: مرجع الشعر العربي';
export const SITE_DESCRIPTION =
  'نعنى بجمع شعر العرب، فحفظه من حفظ كتاب الله، كما قال ابن عباس: الشعر ديوان العرب، فإذا خفي علينا الحرف من القرآن، رجعنا إلى ديوانهم فالتمسناه فيه';

export const SITE_KEYWORDS = [
  'موقع قافية',
  'شعر',
  'شعر عربي',
  'قصائد',
  'معلقات',
  'شعر جاهلي',
  'شعر حديث',
  'قافية',
  'ديوان العرب',
  'أدب',
  'قصائد مشهورة',
  'شعر نبطي',
];

export const SITE_THEME_COLOR_HEX = '#fafafa';
export const OPEN_GRAPH_URL_PATH = '/open-graph-white.png';
export const TWITTER_SUMMARY_CARD_IMAGE_PATH = '/twitter-summary-card-white.png';
export const SITE_ARTICLE_SECTION = 'شعر';

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
};

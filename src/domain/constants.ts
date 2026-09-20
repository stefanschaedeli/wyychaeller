/** A wine counts as "drink soon" during the last N years of its drinking window. */
export const DRINK_SOON_WINDOW_YEARS = 2;

export const DEFAULT_CURRENCY = "CHF";
export const DEFAULT_MONTHLY_AI_CALL_LIMIT = 300;

export const MAXIMUM_PHOTO_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAXIMUM_PHOTO_EDGE_PIXELS = 1500;
export const PHOTO_JPEG_QUALITY = 85;

export const MAXIMUM_SHORT_TEXT_LENGTH = 200;
export const MAXIMUM_LONG_TEXT_LENGTH = 2000;
export const MAXIMUM_BOTTLE_COUNT = 9999;
// Adding wine to the cellar (confirming or merging) needs at least one bottle.
export const MINIMUM_NEW_BOTTLE_COUNT = 1;

export const MAXIMUM_DISH_RECOMMENDATIONS = 3;
export const AI_REQUESTS_PER_MINUTE = 20;

export const MINIMUM_DISH_TEXT_LENGTH = 2;

/** Ordered from most to least talkative; "silent" switches the activity log off. */
export const LOG_LEVELS = ["debug", "info", "warn", "error", "silent"] as const;
export const DEFAULT_LOG_LEVEL = "info";

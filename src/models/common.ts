export type Locale = 'ar' | 'en';

/** Text stored in both supported languages. */
export interface LocalizedText {
  ar: string;
  en: string;
}

/** Amounts are in SAR (whole riyals or halalas as decimals). */
export type Money = number;

/** Visual motif used by the bundled illustration fallback. */
export type Motif =
  | 'magic'
  | 'clown'
  | 'mascot'
  | 'kids'
  | 'interactive'
  | 'bubbles'
  | 'illusion'
  | 'games'
  | 'host'
  | 'variety'
  | 'science'
  | 'puppets';

export interface MediaItem {
  /** Real photo URL (optional). When missing or broken, the illustration is shown. */
  url?: string;
  motif: Motif;
  alt: LocalizedText;
}

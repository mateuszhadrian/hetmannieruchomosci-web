/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** `fixture` = lokalne kopie zdjęć ofert (skrypt `build:visual`) */
  readonly MEDIA_SOURCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

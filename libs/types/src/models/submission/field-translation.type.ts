export interface FieldTranslations {
  title: true;
  tags: true;
  description: true;
  rating: true;
  contentWarning: true;
  useThumbnail: true;
  allowResize: true;
  feature: true;
  species: true;
}

export type FieldTranslationId = keyof FieldTranslations;

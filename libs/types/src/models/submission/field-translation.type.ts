export interface FieldTranslations {
  title: true;
  tags: true;
  description: true;
  rating: true;
  contentWarning: true;
  feature: true;
  species: true;
}

export type FieldTranslationId = keyof FieldTranslations;

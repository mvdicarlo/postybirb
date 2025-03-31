export interface FieldTranslations {
  title: true;
  tags: true;
  description: true;
  rating: true;
  contentWarning: true;
  feature: true;
  species: true;
  spoiler: true;
  useTitle: true;
  category: true;
  folder: true;
  critique: true;
  notify: true;
  allowCommunityTags: true;
  originalWork: true;
  hasSexualContent: true;
  aIGenerated: true;
  matureContent: true;
  containsContent: true;
}

export type FieldTranslationId = keyof FieldTranslations;

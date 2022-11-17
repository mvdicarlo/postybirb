export type TagValue = {
  overrideDefault: boolean;
  tags: string[];
};

export const DefaultTagValue: TagValue = {
  overrideDefault: false,
  tags: [],
};

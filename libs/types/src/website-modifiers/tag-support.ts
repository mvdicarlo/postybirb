export type TagSupport = SupportsTags | NoTagSupport;

type SupportsTags = {
  supportsTags: true;
  maxTags?: number;
  minTags?: number;
};

type NoTagSupport = {
  supportsTags: false;
};

export const UnlimitedTags: SupportsTags = {
  supportsTags: true,
  maxTags: Infinity,
  minTags: 0,
};

import { DescriptionType } from '../enums';

export type DescriptionSupport = {
  supportsDescriptionType: DescriptionType;
  maxDescriptionLength: number;
  minDescriptionLength: number;
};

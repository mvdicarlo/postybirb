export interface Information {
  tags: TagModel;
  description: DescriptionModel;
  options?: any;
}

export interface TagModel {
  tags: string[];
  overwrite: boolean;
}

export interface DescriptionModel {
  description: string,
  useDefault: boolean;
  simple: boolean;
}

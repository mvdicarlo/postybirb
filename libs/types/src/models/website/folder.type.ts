export type Folder = {
  value?: string; // Fall back to label if not provided
  label: string;
  children?: Folder[];
  nsfw?: boolean;
};

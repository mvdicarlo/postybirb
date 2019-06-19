export interface Folder {
  id?: string;
  title: string;
  subfolders?: Folder[];
  nsfw?: boolean;
}

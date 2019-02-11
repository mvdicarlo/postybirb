export interface Folder {
  id: string;
  title: string;
  subfolders?: Folder[]
}

export interface FolderCategory {
  id?: string;
  title: string;
  folders: Folder[];
}

export interface KoFiAlbum {
  label: string;
  value: string;
}

export interface KoFiAccountData {
  id?: string;
  galleryFolders?: KoFiAlbum[];
}
import { SelectOption } from '@postybirb/form-builder';

export type TJAAccountData = {
  username: string;
  displayName: string;
  isArtist: boolean;
  galleries: SelectOption[];
};

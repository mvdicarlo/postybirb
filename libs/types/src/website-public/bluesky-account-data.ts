import { SelectOption } from '@postybirb/form-builder';

export type BlueskyAccountData = {
  username: string;
  password: string;
  folders: SelectOption[];
};

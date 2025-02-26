import { SelectOption } from '@postybirb/form-builder';
import { FileType } from '@postybirb/types';

export const WeasylCategories: Record<FileType, SelectOption[]> = {
  [FileType.IMAGE]: [
    {
      value: '1010',
      label: 'Sketch',
    },
    {
      value: '1020',
      label: 'Traditional',
    },
    {
      value: '1030',
      label: 'Digital',
    },
    {
      value: '1040',
      label: 'Animation',
    },
    {
      value: '1050',
      label: 'Photography',
    },
    {
      value: '1060',
      label: 'Design / Interface',
    },
    {
      value: '1070',
      label: 'Modeling / Sculpture',
    },
    {
      value: '1075',
      label: 'Crafts / Jewelry',
    },
    {
      value: '1080',
      label: 'Desktop / Wallpaper',
    },
    {
      value: '1999',
      label: 'Other',
    },
  ],
  [FileType.TEXT]: [
    {
      value: '2010',
      label: 'Story',
    },
    {
      value: '2020',
      label: 'Poetry / Lyrics',
    },
    {
      value: '2030',
      label: 'Script / Screenplay',
    },
    {
      value: '2999',
      label: 'Other',
    },
  ],
  [FileType.VIDEO]: [
    {
      value: '3500',
      label: 'Embedded Video',
    },
    {
      value: '3999',
      label: 'Other',
    },
  ],
  [FileType.AUDIO]: [
    {
      value: '3010',
      label: 'Original Music',
    },
    {
      value: '3020',
      label: 'Cover Version',
    },
    {
      value: '3030',
      label: 'Remix / Mashup',
    },
    {
      value: '3040',
      label: 'Speech / Reading',
    },
    {
      value: '3999',
      label: 'Other',
    },
  ],
  [FileType.UNKNOWN]: [],
};

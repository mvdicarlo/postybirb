import { BooleanField, SelectField } from '@postybirb/form-builder';
import type { DiscordGalleryArrangement } from '../discord-components';
import { DiscordMessageSubmission } from './discord-message-submission';

export class DiscordFileSubmission extends DiscordMessageSubmission {
  @BooleanField({ label: 'spoiler', section: 'website', order: 1, span: 6 })
  isSpoiler = false;

  @SelectField<DiscordFileSubmission>({
    label: 'mediaPosition',
    section: 'website',
    order: 2,
    span: 12,
    options: [
      { label: 'Above description', value: 'above' },
      { label: 'Below description', value: 'below' },
    ],
  })
  mediaPosition: 'above' | 'below' = 'above';

  @SelectField<DiscordFileSubmission>({
    label: 'galleryArrangement',
    section: 'website',
    order: 3,
    span: 12,
    options: [
      { label: 'Grouped', value: 'grouped' },
      { label: 'Stacked', value: 'stacked' },
      { label: 'Cover + gallery', value: 'cover' },
    ],
  })
  galleryArrangement: DiscordGalleryArrangement = 'grouped';
}

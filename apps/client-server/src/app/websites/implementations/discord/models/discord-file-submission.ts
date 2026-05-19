import { BooleanField } from '@postybirb/form-builder';
import { DiscordMessageSubmission } from './discord-message-submission';

export class DiscordFileSubmission extends DiscordMessageSubmission {
  @BooleanField({ label: 'spoiler', section: 'website', span: 6 })
  isSpoiler = false;
}

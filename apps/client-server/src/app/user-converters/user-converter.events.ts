import { USER_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { UserConverterDto } from '@postybirb/types';

export class UserConverterEvent {
  event: string = USER_CONVERTER_UPDATES;

  data: UserConverterDto[];
}

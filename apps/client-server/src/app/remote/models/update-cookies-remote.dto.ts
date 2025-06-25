import { UpdateCookiesRemote } from '@postybirb/types';
import { IsString } from 'class-validator';

export class UpdateCookiesRemoteDto implements UpdateCookiesRemote {
  @IsString()
  accountId: string;

  @IsString()
  cookies: string;
}

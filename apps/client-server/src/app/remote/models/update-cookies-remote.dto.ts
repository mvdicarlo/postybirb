import { UpdateCookiesRemote } from '@postybirb/types';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateCookiesRemoteDto implements UpdateCookiesRemote {
  @IsString()
  accountId: string;

  @IsString()
  cookies: string;

  @IsObject()
  @IsOptional()
  localStorage?: { url: string; data: Record<string, unknown> };
}

import { IReorderSubmissionFilesDto } from '@postybirb/types';
import { IsObject } from 'class-validator';

export class ReorderSubmissionFilesDto implements IReorderSubmissionFilesDto {
  @IsObject()
  order: Record<string, number>;
}

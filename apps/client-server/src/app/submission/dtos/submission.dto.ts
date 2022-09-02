import { ApiProperty } from '@nestjs/swagger';
import { ISubmissionDto } from '@postybirb/dto';
import {
  IBaseSubmissionMetadata,
  SubmissionType,
  ISubmissionOptions,
  BaseWebsiteOptions,
  ISubmissionScheduleInfo,
  ISubmissionFile,
} from '@postybirb/types';
import { IsArray, IsBoolean, IsObject, IsString } from 'class-validator';

export class SubmissionDto<T extends IBaseSubmissionMetadata>
  implements ISubmissionDto<T>
{
  /**
   * Submission type.
   * @type {SubmissionType}
   */
  @IsObject()
  @IsString()
  type: SubmissionType;

  /**
   * Specific options for each website.
   *
   * @type {ISubmissionOptions<BaseWebsiteOptions>[]}
   * @memberof SubmissionDto
   */
  @ApiProperty()
  @IsArray()
  options: ISubmissionOptions<BaseWebsiteOptions>[];

  /**
   * Whether or not the submission is actively scheduled.
   *
   * @type {boolean}
   */
  @ApiProperty()
  @IsBoolean()
  isScheduled: boolean;

  /**
   * Holds information about how the submission is to be scheduled.
   *
   * @type {ISubmissionScheduleInfo}
   */
  @ApiProperty()
  @IsObject()
  schedule: ISubmissionScheduleInfo;

  /**
   * All files contained within the submission.
   *
   * @type {ISubmissionFile[]}
   */
  @ApiProperty()
  @IsArray()
  files: ISubmissionFile[];

  /**
   * Additional metadata pertaining to the submission type.
   *
   * @type {T}
   */
  @ApiProperty()
  @IsObject()
  metadata: T;

  /**
   * Id of a submission.
   * @type {string}
   */
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  createdAt: Date;

  @ApiProperty()
  @IsString()
  updatedAt: Date;
}

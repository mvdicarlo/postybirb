import { ApiProperty } from '@nestjs/swagger';
import { ISubmissionDto } from '@postybirb/dto';
import { IsArray, IsBoolean, IsObject, IsString } from 'class-validator';
import { ISubmissionFile } from '../../file/models/file';
import SubmissionType from '../enums/submission-type';
import { IBaseSubmissionMetadata } from '../models/base-submission-metadata';
import { BaseWebsiteOptions } from '../models/base-website-options';
import { ISubmissionOptions } from '../models/submission-options';
import { ISubmissionScheduleInfo } from '../models/submission-schedule-info';

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

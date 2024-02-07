import { ApiProperty } from '@nestjs/swagger';
import {
  ISubmissionDto,
  ISubmissionFileDto,
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
  IWebsiteFormFields,
  PostRecordDto,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { IsArray, IsBoolean, IsObject, IsString } from 'class-validator';

export class SubmissionDto<T extends ISubmissionMetadata = ISubmissionMetadata>
  implements ISubmissionDto<T>
{
  posts: PostRecordDto[];

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
   * @type {ISubmissionOptions<IBaseWebsiteOptions>[]}
   * @memberof SubmissionDto
   */
  @ApiProperty()
  @IsArray()
  options: WebsiteOptionsDto<IWebsiteFormFields>[];

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
  files: ISubmissionFileDto[];

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
  createdAt: string;

  @ApiProperty()
  @IsString()
  updatedAt: string;
}

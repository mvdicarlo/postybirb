import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  EntityId,
  FileSubmission,
  FileType,
  isFileSubmission,
  ISubmission,
  SubmissionFileMetadata,
  SubmissionId,
  SubmissionType,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { PostyBirbService } from '../../common/service/postybirb-service';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { FileService } from '../../file/file.service';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { ReorderSubmissionFilesDto } from '../dtos/reorder-submission-files.dto';
import { UpdateAltFileDto } from '../dtos/update-alt-file.dto';
import { ISubmissionService } from './submission-service.interface';
import { SubmissionService } from './submission.service';

/**
 * Service that implements logic for manipulating a FileSubmission.
 * All actions perform mutations on the original object.
 *
 * @class FileSubmissionService
 * @implements {ISubmissionService<FileSubmission>}
 */
@Injectable()
export class FileSubmissionService
  extends PostyBirbService<'SubmissionSchema'>
  implements ISubmissionService<FileSubmission>
{
  constructor(
    private readonly fileService: FileService,
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService,
  ) {
    super(
      new PostyBirbDatabase('SubmissionSchema', {
        files: true,
      }),
    );
  }

  async populate(
    submission: FileSubmission,
    createSubmissionDto: CreateSubmissionDto,
    file: MulterFileInfo,
  ): Promise<void> {
    // eslint-disable-next-line no-param-reassign
    submission.metadata = {
      ...submission.metadata,
    };

    await this.appendFile(submission, file);
  }

  private guardIsFileSubmission(submission: ISubmission) {
    if (!isFileSubmission(submission)) {
      throw new BadRequestException(
        `Submission '${(submission as ISubmission).id}' is not a ${SubmissionType.FILE} submission.`,
      );
    }

    if (submission.metadata.template) {
      throw new BadRequestException(
        `Submission '${submission.id}' is a template and cannot have files.`,
      );
    }
  }

  /**
   * Guards against mixing different file types in the same submission.
   * For example, prevents adding an IMAGE file to a submission that already contains a TEXT (PDF) file.
   *
   * @param {FileSubmission} submission - The submission to check
   * @param {MulterFileInfo} file - The new file being added
   * @throws {BadRequestException} if file types are incompatible
   */
  private guardFileTypeCompatibility(
    submission: FileSubmission,
    file: MulterFileInfo,
  ) {
    if (!submission.files || submission.files.length === 0) {
      return; // No existing files, any type is allowed
    }

    const newFileType = getFileType(file.originalname);
    const existingFileType = getFileType(submission.files[0].fileName);

    if (newFileType !== existingFileType) {
      const fileTypeLabels: Record<FileType, string> = {
        [FileType.IMAGE]: 'IMAGE',
        [FileType.VIDEO]: 'VIDEO',
        [FileType.AUDIO]: 'AUDIO',
        [FileType.TEXT]: 'TEXT',
        [FileType.UNKNOWN]: 'UNKNOWN',
      };
      throw new BadRequestException(
        `Cannot add ${fileTypeLabels[newFileType]} file to a submission containing ${fileTypeLabels[existingFileType]} files. All files in a submission must be of the same type.`,
      );
    }
  }

  /**
   * Adds a file to a submission.
   *
   * @param {string} id
   * @param {MulterFileInfo} file
   */
  async appendFile(id: EntityId | FileSubmission, file: MulterFileInfo) {
    const submission = (
      typeof id === 'string'
        ? await this.repository.findById(id, {
            failOnMissing: true,
          })
        : id
    ) as FileSubmission;

    this.guardIsFileSubmission(submission);
    this.guardFileTypeCompatibility(submission, file);

    const createdFile = await this.fileService.create(file, submission);
    this.logger
      .withMetadata(submission)
      .info(`Created file ${createdFile.id} = ${submission.id}`);

    await this.repository.update(submission.id, {
      metadata: submission.metadata,
    });

    return submission;
  }

  async replaceFile(id: EntityId, fileId: EntityId, file: MulterFileInfo) {
    const submission = (await this.repository.findById(
      id,
    )) as unknown as FileSubmission;
    this.guardIsFileSubmission(submission);

    await this.fileService.update(file, fileId, false);
  }

  /**
   * Replaces a thumbnail file.
   *
   * @param {SubmissionId} id
   * @param {EntityId} fileId
   * @param {MulterFileInfo} file
   */
  async replaceThumbnail(
    id: SubmissionId,
    fileId: EntityId,
    file: MulterFileInfo,
  ) {
    const submission = (await this.repository.findById(
      id,
    )) as unknown as FileSubmission;
    this.guardIsFileSubmission(submission);

    await this.fileService.update(file, fileId, true);
  }

  /**
   * Removes a file of thumbnail that matches file id.
   *
   * @param {SubmissionId} id
   * @param {EntityId} fileId
   */
  async removeFile(id: SubmissionId, fileId: EntityId) {
    const submission = (await this.repository.findById(
      id,
    )) as unknown as FileSubmission;
    this.guardIsFileSubmission(submission);

    await this.fileService.remove(fileId);
    await this.repository.update(submission.id, {
      metadata: submission.metadata,
    });
  }

  getAltFileText(id: EntityId) {
    return this.fileService.getAltText(id);
  }

  updateAltFileText(id: EntityId, update: UpdateAltFileDto) {
    return this.fileService.updateAltText(id, update);
  }

  updateMetadata(id: EntityId, update: SubmissionFileMetadata) {
    return this.fileService.updateMetadata(id, update);
  }

  reorderFiles(update: ReorderSubmissionFilesDto) {
    return this.fileService.reorderFiles(update);
  }
}

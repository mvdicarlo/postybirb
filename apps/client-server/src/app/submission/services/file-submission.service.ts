import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  EntityId,
  FileMetadataFields,
  FileSubmission,
  isFileSubmission,
  ISubmission,
  SubmissionId,
  SubmissionType,
} from '@postybirb/types';
import { PostyBirbService } from '../../common/service/postybirb-service';
import { FileService } from '../../file/file.service';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
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
    super('SubmissionSchema');
  }

  async populate(
    submission: FileSubmission,
    createSubmissionDto: CreateSubmissionDto,
    file: MulterFileInfo,
  ): Promise<void> {
    // eslint-disable-next-line no-param-reassign
    submission.metadata = {
      ...submission.metadata,
      order: [],
      fileMetadata: {},
    };

    await this.appendFile(submission, file, false);
  }

  private guardIsFileSubmission(submission: ISubmission) {
    if (!isFileSubmission(submission)) {
      throw new BadRequestException(
        `Submission '${submission.id}' is not a ${SubmissionType.FILE} submission.`,
      );
    }

    if (submission.metadata.template) {
      throw new BadRequestException(
        `Submission '${submission.id}' is a template and cannot have files.`,
      );
    }
  }

  /**
   * Adds a file to a submission.
   *
   * @param {string} id
   * @param {MulterFileInfo} file
   */
  async appendFile(
    id: EntityId | FileSubmission,
    file: MulterFileInfo,
    persist = true,
  ) {
    const submission = (
      typeof id === 'string'
        ? await this.repository.findById(id, {
            failOnMissing: true,
          })
        : id
    ) as FileSubmission;

    this.guardIsFileSubmission(submission);

    const createdFile = await this.fileService.create(file, submission);
    submission.metadata.order.push(createdFile.id);
    this.logger
      .withMetadata(submission)
      .info(`Created file ${createdFile.id} = ${submission.id}`);

    const fileModifications: FileMetadataFields = {
      altText: '',
      dimensions: {
        default: {
          fileId: createdFile.id,
          height: createdFile.height,
          width: createdFile.width,
        },
      },
      ignoredWebsites: [],
      sourceUrls: [],
    };

    // eslint-disable-next-line no-param-reassign
    submission.metadata.fileMetadata[createdFile.id] = fileModifications;
    if (persist) {
      await this.repository.update(submission.id, {
        metadata: submission.metadata,
      });
      this.submissionService.emit();
    }
    return submission;
  }

  async replaceFile(id: EntityId, fileId: EntityId, file: MulterFileInfo) {
    const submission = (await this.repository.findById(
      id,
    )) as unknown as FileSubmission;
    this.guardIsFileSubmission(submission);

    if (
      !submission.metadata.order.some(
        (metaFileOrderId) => metaFileOrderId === fileId,
      )
    ) {
      throw new BadRequestException('File not found on submission');
    }

    await this.fileService.update(file, fileId, false);
    await this.repository.update(submission.id, {
      metadata: submission.metadata,
    });
    this.submissionService.emit();
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
    this.submissionService.emit();
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
    // eslint-disable-next-line no-param-reassign
    submission.metadata.order = submission.metadata.order.filter(
      (metaFileOrderId) => metaFileOrderId !== fileId,
    );
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
}

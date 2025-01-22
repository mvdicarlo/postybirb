import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
    EntityId,
    FileMetadataFields,
    FileSubmission,
    ISubmission,
    SubmissionMetadataType,
    SubmissionType,
    isFileSubmission,
} from '@postybirb/types';
import { PostyBirbService } from '../../common/service/postybirb-service';
import { PostyBirbRepository } from '../../database/repositories/postybirb-repository';
import { Submission } from '../../drizzle/models';
import { FileService } from '../../file/file.service';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { UpdateAltFileDto } from '../dtos/update-alt-file.dto';
import { ISubmissionService } from './submission-service.interface';

type SubmissionEntity = Submission<SubmissionMetadataType>;

/**
 * Service that implements logic for manipulating a FileSubmission.
 * All actions perform mutations on the original object.
 *
 * @class FileSubmissionService
 * @implements {ISubmissionService<FileSubmission>}
 */
@Injectable()
export class FileSubmissionService
  extends PostyBirbService<SubmissionEntity>
  implements ISubmissionService<FileSubmission>
{
  constructor(
    @InjectRepository(Submission)
    repository: PostyBirbRepository<SubmissionEntity>,
    private readonly fileService: FileService,
  ) {
    super(repository);
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
    id: string | FileSubmission,
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
    submission.files.add(createdFile);
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
    };

    // eslint-disable-next-line no-param-reassign
    submission.metadata.fileMetadata[createdFile.id] = fileModifications;
    if (persist) {
      await this.repository.persistAndFlush(submission);
    }
    return submission;
  }

  async replaceFile(id: string, fileId: string, file: MulterFileInfo) {
    const submission = (await this.repository.findById(id)) as FileSubmission;
    this.guardIsFileSubmission(submission);

    if (
      !submission.metadata.order.some(
        (metaFileOrderId) => metaFileOrderId === fileId,
      )
    ) {
      throw new BadRequestException('File not found on submission');
    }

    await this.fileService.update(file, fileId, false);
    await this.repository.persistAndFlush(submission);
  }

  /**
   * Replaces a thumbnail file.
   *
   * @param {string} id
   * @param {string} fileId
   * @param {MulterFileInfo} file
   */
  async replaceThumbnail(id: string, fileId: string, file: MulterFileInfo) {
    const submission = (await this.repository.findById(id)) as FileSubmission;
    this.guardIsFileSubmission(submission);

    await this.fileService.update(file, fileId, true);
    await this.repository.persistAndFlush(submission);
  }

  /**
   * Removes a file of thumbnail that matches file id.
   *
   * @param {string} id
   * @param {string} fileId
   */
  async removeFile(id: string, fileId: string) {
    const submission = (await this.repository.findById(id)) as FileSubmission;
    this.guardIsFileSubmission(submission);

    await this.fileService.remove(fileId);
    // eslint-disable-next-line no-param-reassign
    submission.metadata.order = submission.metadata.order.filter(
      (metaFileOrderId) => metaFileOrderId !== fileId,
    );
    await this.repository.persistAndFlush(submission);
  }

  getAltFileText(id: EntityId) {
    return this.fileService.getAltText(id);
  }

  updateAltFileText(id: EntityId, update: UpdateAltFileDto) {
    return this.fileService.updateAltText(id, update);
  }
}

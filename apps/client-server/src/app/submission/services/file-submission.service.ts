import { Injectable, NotFoundException } from '@nestjs/common';
import { FileService } from '../../file/file.service';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { FileSubmission } from '../models/file-submission';
import { ISubmissionService } from '../models/submission-service';

/**
 * Service that implements logic for manipulating a FileSubmission.
 * All actions perform mutations on the original object.
 *
 * @class FileSubmissionService
 * @implements {ISubmissionService<FileSubmission>}
 */
@Injectable()
export class FileSubmissionService
  implements ISubmissionService<FileSubmission>
{
  constructor(private readonly fileService: FileService) {}

  async populate(
    submission: FileSubmission,
    createSubmissionDto: CreateSubmissionDto,
    file: MulterFileInfo
  ): Promise<void> {
    submission.files.add(await this.fileService.create(file));
  }

  async remove(submission: FileSubmission) {
    // Nothing yet
  }

  async appendFile(submission: FileSubmission, file: MulterFileInfo) {
    submission.files.add(await this.fileService.create(file));
  }

  async appendThumbnailFile(
    submission: FileSubmission,
    fileId: string,
    file: MulterFileInfo
  ) {
    const fileEntity = await this.fileService.create(file);
    // eslint-disable-next-line no-param-reassign
    submission.metadata.thumbnail = fileEntity.id;
  }

  // TODO test
  async replaceThumbnailFile(
    submission: FileSubmission,
    fileId: string,
    file: MulterFileInfo
  ) {
    const thumbnailReference = submission.metadata.thumbnail;
    if (!thumbnailReference) {
      throw new NotFoundException(`File ${fileId} not found.`);
    }

    if (thumbnailReference) {
      await this.removeFile(submission, fileId);
      const fileEntity = await this.fileService.create(file);
      // eslint-disable-next-line no-param-reassign
      submission.metadata.thumbnail = fileEntity.id;
    }
  }

  async removeFile(submission: FileSubmission, fileId: string) {
    // eslint-disable-next-line no-param-reassign
    submission.files.remove(
      submission.files.getItems().find((f) => f.id !== fileId)
    );
    await this.fileService.remove(fileId);
  }

  async replaceFile(
    submission: FileSubmission,
    fileId: string,
    file: MulterFileInfo
  ) {
    // TODO in-place replacement
    await this.removeFile(submission, fileId);
    submission.files.add(await this.fileService.create(file));
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { FileModifications, FileSubmission } from '@postybirb/types';
import { FileService } from '../../file/file.service';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { ISubmissionService } from './submission-service';

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
    // eslint-disable-next-line no-param-reassign
    submission.metadata = {
      ...submission.metadata,
      order: [],
      modifiedFiles: {},
    };

    await this.appendFile(submission, file);
  }

  async remove(submission: FileSubmission) {
    // Nothing yet
  }

  async appendFile(
    submission: FileSubmission,
    file: MulterFileInfo,
    append = true
  ) {
    const createdFile = await this.fileService.create(file, submission);
    submission.files.add(createdFile);
    if (append) {
      submission.metadata.order.push(createdFile.id);
    }

    const fileModifications: FileModifications = {
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
    submission.metadata.modifiedFiles[createdFile.id] = fileModifications;
    return createdFile;
  }

  async replaceThumbnailFile(fileId: string, file: MulterFileInfo) {
    return this.fileService.replaceFileThumbnail(fileId, file);
  }

  async removeFile(submission: FileSubmission, fileId: string) {
    await this.fileService.remove(fileId);
    // eslint-disable-next-line no-param-reassign
    submission.metadata.order = submission.metadata.order.filter(
      (id) => id !== fileId
    );
  }

  async replaceFile(
    submission: FileSubmission,
    fileId: string,
    file: MulterFileInfo
  ) {
    if (!submission.metadata.order.some((id) => id === fileId)) {
      throw new BadRequestException('File not found on submission');
    }

    await this.fileService.replacePrimaryFile(fileId, file);
  }
}

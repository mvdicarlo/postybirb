import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import {
  FileSubmission,
  FileSubmissionFileReference,
} from '../models/file-submission';
import { ISubmissionService } from '../models/submission-service';
import { FileService } from '../../file/file.service';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { File } from '../../file/entities/file.entity';

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
    const { metadata } = submission;
    const fileEntity = await this.fileService.create(file);
    metadata.files = [this.createFileMetadata(fileEntity)];
  }

  async remove(submission: FileSubmission) {
    const individualFiles = [];
    submission.metadata.files.forEach((file) => {
      individualFiles.push(file.primary);

      if (file.thumbnail) {
        individualFiles.push(file.thumbnail);
      }
    });

    await Promise.allSettled(
      individualFiles.map((file) => this.fileService.remove(file))
    );
  }

  async appendFile(submission: FileSubmission, file: MulterFileInfo) {
    const fileEntity = await this.fileService.create(file);
    submission.metadata.files.push(this.createFileMetadata(fileEntity));
  }

  async appendThumbnailFile(
    submission: FileSubmission,
    fileId: string,
    file: MulterFileInfo
  ) {
    const fileReference = submission.metadata.files.find(
      (f) => f.primary === fileId
    );
    if (!fileReference) {
      throw new NotFoundException(`File ${fileId} not found.`);
    }

    const fileEntity = await this.fileService.create(file);
    fileReference.thumbnail = fileEntity.id;
  }

  async replaceThumbnailFile(
    submission: FileSubmission,
    fileId: string,
    file: MulterFileInfo
  ) {
    const fileReference = submission.metadata.files.find(
      (f) => f.primary === fileId
    );
    if (!fileReference) {
      throw new NotFoundException(`File ${fileId} not found.`);
    }

    if (fileReference.thumbnail) {
      await this.fileService.remove(fileReference.thumbnail);
      const fileEntity = await this.fileService.create(file);
      fileReference.thumbnail = fileEntity.id;
    }
  }

  async removeFile(submission: FileSubmission, fileId: string) {
    // eslint-disable-next-line no-param-reassign
    submission.metadata.files = submission.metadata.files.filter(
      (f) => f.primary !== fileId
    );

    submission.metadata.files.forEach((f) => {
      if (f.thumbnail === fileId) {
        // eslint-disable-next-line no-param-reassign
        f.thumbnail = undefined;
      }
    });

    await this.fileService.remove(fileId);
  }

  async replaceFile(
    submission: FileSubmission,
    fileId: string,
    file: MulterFileInfo
  ) {
    const fileReference = submission.metadata.files.find(
      (f) => f.primary === fileId
    );
    if (!fileReference) {
      throw new NotFoundException(`File ${fileId} not found.`);
    }

    const fileEntity = await this.fileService.create(file);
    fileReference.primary = fileEntity.id;
  }

  private createFileMetadata(file: File): FileSubmissionFileReference {
    return {
      primary: file.id,
      primarySkipWebsites: [],
      thumbnail: undefined,
      thumbnailSkipWebsites: [],
    };
  }
}

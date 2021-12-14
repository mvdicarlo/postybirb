import { Injectable } from '@nestjs/common';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { FileSubmission } from '../models/file-submission.model';
import { ISubmissionService } from '../models/submission-service.interface';
import { Express } from 'express';
import 'multer';
import { FileService } from '../../file/file.service';

@Injectable()
export class FileSubmissionService
  implements ISubmissionService<FileSubmission>
{
  constructor(private readonly fileService: FileService) {}

  async populate(
    submission: FileSubmission,
    createSubmissionDto: CreateSubmissionDto,
    file: Express.Multer.File
  ): Promise<void> {
    const { metadata } = submission;
    metadata.files = [
      {
        primary: (await this.fileService.create(file)).id,
        primarySkipWebsites: [],
        thumbnail: undefined,
        thumbnailSkipWebsites: [],
      },
    ];
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
}

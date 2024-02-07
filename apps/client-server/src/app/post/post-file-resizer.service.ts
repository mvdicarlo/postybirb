import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { ISubmissionFile } from '@postybirb/types';
import type { queueAsPromised } from 'fastq';
import fastq from 'fastq';
import { cpus } from 'os';
import { PrimaryFile } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';

/**
 * Responsible for resizing an image file to a smaller size before
 * posting to a website.
 * @class PostFileResizer
 */
@Injectable()
export class PostFileResizerService {
  private readonly logger = Logger();

  private readonly queue: queueAsPromised<ISubmissionFile, ISubmissionFile> =
    fastq.promise<this, ISubmissionFile>(
      this,
      this.process,
      Math.min(cpus().length, 4)
    );

  constructor(
    private readonly fileRepository: PostyBirbRepository<PrimaryFile>
  ) {}

  public async resize(file: ISubmissionFile): Promise<ISubmissionFile> {
    return this.queue.push(file);
  }

  private async process(file: ISubmissionFile): Promise<ISubmissionFile> {
    // TODO implement image resizing
    return null;
  }
}

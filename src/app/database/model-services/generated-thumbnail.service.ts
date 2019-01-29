import { Injectable } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { ISubmissionFile, SubmissionFileType } from '../tables/submission-file.table';
import { GeneratedThumbnailTableName, IGeneratedThumbnail } from '../tables/generated-thumbnail.table';

@Injectable({
  providedIn: 'root'
})
export class GeneratedThumbnailDBService extends DatabaseService {

  constructor() {
    super();
  }

  public getThumbnail(submissionId: number, type: SubmissionFileType): Promise<IGeneratedThumbnail[]> {
    return this.connection.select({
      from: GeneratedThumbnailTableName,
      where: {
        fileType: type,
        submissionId
      }
    });
  }

  public async createThumbnails(files: ISubmissionFile[]): Promise<any> {
    const modelObjs = await this._generateThumbnails(files);
    return await this.connection.insert({
      into: GeneratedThumbnailTableName,
      values: modelObjs
    });
  }

  public deleteBySubmissionId(submissionId: number): void {
    this.connection.remove({
      from: GeneratedThumbnailTableName,
      where: {
        submissionId
      }
    });
  }

  private _generateThumbnails(files: ISubmissionFile[]): Promise<IGeneratedThumbnail[]> {
    return Promise.all(files.map(f => this._generate(f)));
  }

  private async _generate(file: ISubmissionFile): Promise<IGeneratedThumbnail> {
    let ni = null;

    if (file.fileInfo.type.includes('image')) {
      ni = nativeImage.createFromBuffer(Buffer.from(file.buffer));
    } else { // other file types that don't have an image thumbnail
      ni = await new Promise((resolve) => {
        getFileIcon(file.fileInfo.path, {
          size: 'normal'
        }, (err, n) => {
          resolve(n);
        });
      });
    }

    const resized = ni.resize({
      width: 150,
      height: 150,
      quality: 'better'
    });

    const fileBuffer: Buffer = resized.toJPEG(100);
    return {
      id: undefined,
      submissionId: file.submissionId,
      submissionFileId: file.id,
      type: file.fileInfo.type,
      fileType: file.fileType,
      buffer: new Uint8Array(fileBuffer.buffer)
    }
  }
}

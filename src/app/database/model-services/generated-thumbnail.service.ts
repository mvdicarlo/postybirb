import { Injectable } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { ISubmissionFile, SubmissionFileType } from '../tables/submission-file.table';
import { GeneratedThumbnailTableName, IGeneratedThumbnail } from '../tables/generated-thumbnail.table';
import { isImage, isGIF, arrayBufferAsBlob, blobToUint8Array } from 'src/app/utils/helpers/file.helper';

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

  public getThumbnailBySubmissionFileId(submissionFileId: number): Promise<IGeneratedThumbnail[]> {
    return this.connection.select({
      from: GeneratedThumbnailTableName,
      where: {
        submissionFileId
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

  public async regenerateThumbnails(submissionFiles: ISubmissionFile[]): Promise<any> {
    const newThumbnails = await this._generateThumbnails(submissionFiles);
    for (let i = 0; i < newThumbnails.length; i++) {
      await this.connection.update({
        in: GeneratedThumbnailTableName,
        set: {
          buffer: newThumbnails[i].buffer,
        },
        where: {
          submissionFileId: newThumbnails[i].submissionFileId
        }
      });
    }
  }

  public deleteBySubmissionId(submissionIds: number[]): void {
    this.connection.remove({
      from: GeneratedThumbnailTableName,
      where: {
        submissionId: {
          in: submissionIds
        }
      }
    });
  }

  public deleteBySubmissionFileIds(ids: number[]): Promise<any> {
    return this.connection.remove({
      from: GeneratedThumbnailTableName,
      where: {
        submissionFileId: {
          in: ids
        }
      }
    });
  }

  private _generateThumbnails(files: ISubmissionFile[]): Promise<IGeneratedThumbnail[]> {
    return Promise.all(files.map(f => this._generate(f)));
  }

  private async _generate(file: ISubmissionFile): Promise<IGeneratedThumbnail> {
    let ni = null;

    if (isImage(file.fileInfo) && !isGIF(file.fileInfo)) { // may need a better way to handle GIF thumbnails
      ni = nativeImage.createFromBuffer(Buffer.from(await blobToUint8Array(file.buffer)));
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
      fileType: file.fileType,
      buffer: arrayBufferAsBlob(new Uint8Array(fileBuffer.buffer), 'image/jpeg')
    }
  }
}

import { Injectable } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { ISubmissionFile } from '../tables/submission-file.table';
import { GeneratedThumbnailTableName, IGeneratedThumbnail } from '../tables/generated-thumbnail.table';

@Injectable({
  providedIn: 'root'
})
export class GeneratedThumbnailDBService extends DatabaseService {

  constructor() {
    super();
  }

  public async createThumbnails(files: ISubmissionFile[]): Promise<any> {
    const modelObjs = await this._generateThumbnails(files);
    return await this.connection.insert({
      into: GeneratedThumbnailTableName,
      values: modelObjs
    });
  }

  private _generateThumbnails(files: ISubmissionFile[]): Promise<IGeneratedThumbnail[]> {
    return Promise.all(files.map(f => this._generate(f)));
  }

  private async _generate(file: ISubmissionFile): Promise<IGeneratedThumbnail> {
    let ni = null;

    if (file.type.includes('image')) {
      ni = nativeImage.createFromBuffer(Buffer.from(file.buffer));
    } else { // other file types that don't have an image thumbnail
      ni = await new Promise((resolve) => {
        getFileIcon(file.path, {
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

    const fileBuffer: Buffer = resized.toJPEG(90);
    return {
      id: undefined,
      submissionFileId: file.id,
      type: file.type,
      buffer: new Uint8Array(fileBuffer.buffer)
    }
  }
}

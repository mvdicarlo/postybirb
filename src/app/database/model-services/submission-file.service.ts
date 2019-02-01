import { Injectable } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { SubmissionFileTableName, ISubmissionFile, SubmissionFileType, asFileObject } from '../tables/submission-file.table';
import { ModifiedReadFile } from 'src/app/postybirb/layouts/postybirb-layout/postybirb-layout.component';
import { GeneratedThumbnailDBService } from './generated-thumbnail.service';
import { ReadFile } from 'src/app/utils/helpers/file-reader.helper';

@Injectable({
  providedIn: 'root'
})
export class SubmissionFileDBService extends DatabaseService {

  constructor(private _generatedThumbnailDB: GeneratedThumbnailDBService) {
    super();
  }

  public getFilesBySubmissionId(submissionId: number): Promise<ISubmissionFile[]> {
    return this.connection.select({
      from: SubmissionFileTableName,
      where: {
        submissionId
      }
    });
  }

  public getSubmissionFilesById(id: number): Promise<ISubmissionFile[]> {
    return this.connection.select({
      from: SubmissionFileTableName,
      where: {
        id
      }
    });
  }

  public createSubmissionFiles(submissionId: number, fileType: SubmissionFileType, files: ModifiedReadFile[]): Promise<ISubmissionFile[]> {
    return new Promise((resolve, reject) => {
      const models = this._convertToModel(submissionId, fileType, files);
      this.connection.insert({
        into: SubmissionFileTableName,
        values: models,
        return: true
      }).then((results: ISubmissionFile[]) => {
        this._generatedThumbnailDB.createThumbnails(results)
          .then(() => {
            resolve(results);
          });
      });
    });
  }

  public async updateSubmissionFileById(submissionFileId: number, file: ReadFile): Promise<any> {
    await this.connection.update({
      in: SubmissionFileTableName,
      set: {
        buffer: file.buffer,
        fileInfo: asFileObject(file.file)
      },
      where: {
        id: submissionFileId
      }
    });

    return this._generatedThumbnailDB.regenerateThumbnails(await this.getSubmissionFilesById(submissionFileId));
  }

  public deleteBySubmissionId(submissionIds: number[]): void {
    this.connection.remove({
      from: SubmissionFileTableName,
      where: {
        submissionId: {
          in: submissionIds
        }
      }
    });
  }

  private _convertToModel(submissionId: number, fileType: SubmissionFileType, files: ModifiedReadFile[]): ISubmissionFile[] {
    const modelObjs: ISubmissionFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file: ModifiedReadFile = files[i];

      if (file.width && file.height && (file.height != file.originalHeight || file.width != file.originalWidth)) {
        const ni = nativeImage.createFromBuffer(Buffer.from(file.buffer))
        const resizedNi = ni.resize({
          width: Math.min(Number(file.width), Number(file.originalWidth)),
          height: Math.min(Number(file.height), Number(file.originalHeight)),
          quality: 'best'
        });

        if (file.file.type.includes('png')) {
          file.buffer = new Uint8Array(resizedNi.toPNG());
        } else {
          file.buffer = new Uint8Array(resizedNi.toJPEG(100));
        }
      }

      modelObjs.push({
        id: undefined,
        submissionId,
        buffer: file.buffer,
        fileInfo: asFileObject(file.file),
        fileType
      });
    }

    return modelObjs;
  }
}

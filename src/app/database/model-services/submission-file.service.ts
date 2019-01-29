import { Injectable } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { SubmissionFileTableName, ISubmissionFile, SubmissionFileType, asFileObject } from '../tables/submission-file.table';
import { ModifiedReadFile } from 'src/app/postybirb/layouts/postybirb-layout/postybirb-layout.component';
import { GeneratedThumbnailDBService } from './generated-thumbnail.service';

@Injectable({
  providedIn: 'root'
})
export class SubmissionFileDBService extends DatabaseService {

  constructor(private _generatedThumbnailDB: GeneratedThumbnailDBService) {
    super();
  }

  public getFilesBySubmissionId(submissionId: string): Promise<ISubmissionFile[]> {
    return this.connection.select({
      from: SubmissionFileTableName,
      where: {
        submissionId
      }
    });
  }

  public createSubmissionFiles(submissionId: number, fileType: SubmissionFileType, files: ModifiedReadFile[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const models = this._convertToModel(submissionId, fileType, files);
      this.connection.insert({
        into: SubmissionFileTableName,
        values: models,
        return: true
      }).then((results: ISubmissionFile[]) => {
        this._generatedThumbnailDB.createThumbnails(results)
        .then(() => {
          resolve();
        });
      });
    })
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
      modelObjs.push ({
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

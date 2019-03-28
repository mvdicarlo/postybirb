import { Injectable } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { SubmissionFileTableName, ISubmissionFile, SubmissionFileType, asFileObject } from '../tables/submission-file.table';
import { GeneratedThumbnailDBService } from './generated-thumbnail.service';
import { FileMetadata } from 'src/app/utils/helpers/file-reader.helper';
import { isImage, isType, isGIF, arrayBufferAsBlob } from 'src/app/utils/helpers/file.helper';

@Injectable({
  providedIn: 'root'
})
export class SubmissionFileDBService extends DatabaseService {

  constructor(private _generatedThumbnailDB: GeneratedThumbnailDBService) {
    super();
  }

  public createSubmissionFiles(submissionId: number, fileType: SubmissionFileType, files: FileMetadata[]): Promise<ISubmissionFile[]> {
    return new Promise((resolve) => {
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

  public async deleteSubmissionFileById(id: number): Promise<any> {
    await this.connection.remove({
      from: SubmissionFileTableName,
      where: {
        id
      }
    });

    return await this._generatedThumbnailDB.deleteBySubmissionFileIds([id]);
  }

  public async duplicateWithSubmissionId(originalId: number, newId: number): Promise<ISubmissionFile[]> {
    const files: ISubmissionFile[] = await this.getFilesBySubmissionId(originalId);
    if (files.length) {
      const fileCopies: ISubmissionFile[] = files.map(f => {
        delete f.id;
        f.submissionId = newId;
        return f;
      });

      const rowsInserted: ISubmissionFile[] = await <Promise<ISubmissionFile[]>>this.connection.insert({
        into: SubmissionFileTableName,
        values: fileCopies,
        return: true
      });

      if (rowsInserted.length > 0) {
        await this._generatedThumbnailDB.createThumbnails(rowsInserted);
        return rowsInserted;
      }

    }

    return [];
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

  public async updateSubmissionFileById(submissionFileId: number, file: FileMetadata, useBuffer: boolean = false): Promise<any> {
    await this.connection.update({
      in: SubmissionFileTableName,
      set: {
        buffer: !useBuffer ? file.file : arrayBufferAsBlob(file.buffer, file.file.type),
        fileInfo: asFileObject(file.file)
      },
      where: {
        id: submissionFileId
      }
    });

    return this._generatedThumbnailDB.regenerateThumbnails(await this.getSubmissionFilesById(submissionFileId));
  }

  private _convertToModel(submissionId: number, fileType: SubmissionFileType, files: FileMetadata[]): ISubmissionFile[] {
    const modelObjs: ISubmissionFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file: FileMetadata = files[i];

      let altered: boolean = false;

      if (file.isImage && !file.isGIF && file.width && file.height && (file.height != file.originalHeight || file.width != file.originalWidth)) {
        const ni = nativeImage.createFromBuffer(Buffer.from(file.buffer))
        const resizedNi = ni.resize({
          width: Math.min(Number(file.width), Number(file.originalWidth)),
          height: Math.min(Number(file.height), Number(file.originalHeight)),
          quality: 'best'
        });

        if (isType(file.file, 'png')) {
          file.buffer = new Uint8Array(resizedNi.toPNG());
        } else if (!file.isGIF) {
          file.buffer = new Uint8Array(resizedNi.toJPEG(100));
        }

        altered = true;
      }

      modelObjs.push({
        id: undefined,
        submissionId,
        buffer: altered || file.buffer instanceof Uint8Array ? arrayBufferAsBlob(file.buffer, file.file.type) : file.file,
        fileInfo: asFileObject(file.file),
        fileType
      });
    }

    return modelObjs;
  }
}

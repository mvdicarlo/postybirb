import { Pipe, PipeTransform } from '@angular/core';
import { IGeneratedThumbnail } from '../tables/generated-thumbnail.table';
import { GeneratedThumbnailDBService } from '../model-services/generated-thumbnail.service';

@Pipe({
  name: 'thumbnailFromFileId'
})
export class ThumbnailFromFileIdPipe implements PipeTransform {

  constructor(private _generatedThumbnailDB: GeneratedThumbnailDBService) {}

  async transform(submissionFileId: number): Promise<Blob> {
    const files: IGeneratedThumbnail[] = await this._generatedThumbnailDB.getThumbnailBySubmissionFileId(submissionFileId);
    if (files && files.length) {
      return files.shift().buffer;
    }

    return null;
  }

}

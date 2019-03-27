import { Pipe, PipeTransform } from '@angular/core';
import { GeneratedThumbnailDBService } from '../model-services/generated-thumbnail.service';
import { SubmissionFileType } from '../tables/submission-file.table';
import { IGeneratedThumbnail } from '../tables/generated-thumbnail.table';

@Pipe({
  name: 'thumbnail'
})
export class ThumbnailPipe implements PipeTransform {

  constructor(private _generatedThumbnailDB: GeneratedThumbnailDBService) {}

  async transform(submissionId: number, type: SubmissionFileType): Promise<Blob> {
    const files: IGeneratedThumbnail[] = await this._generatedThumbnailDB.getThumbnail(submissionId, type);
    if (files && files.length) {
      return files.shift().buffer;
    }

    return null;
  }

}

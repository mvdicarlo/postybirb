import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { SubmissionFileDBService } from 'src/app/database/model-services/submission-file.service';

@Component({
  selector: 'image-preview-dialog',
  templateUrl: './image-preview-dialog.component.html',
  styleUrls: ['./image-preview-dialog.component.css']
})
export class ImagePreviewDialog implements OnInit {
  public fileBuffer: Blob;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private _submissionFileDB: SubmissionFileDBService) { }

  ngOnInit() {
    this._submissionFileDB.getSubmissionFilesById(this.data).then(files => {
      this.fileBuffer = files[0].buffer;
    });
  }

}

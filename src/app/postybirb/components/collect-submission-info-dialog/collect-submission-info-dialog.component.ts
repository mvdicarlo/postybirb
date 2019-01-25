import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { ReadFile } from 'src/app/utils/helpers/file-reader.helper';

@Component({
  selector: 'collect-submission-info-dialog',
  templateUrl: './collect-submission-info-dialog.component.html',
  styleUrls: ['./collect-submission-info-dialog.component.css']
})
export class CollectSubmissionInfoDialog implements OnInit {

  constructor(@Inject(MAT_DIALOG_DATA) public data: ReadFile[]) { }

  ngOnInit() {
  }

}

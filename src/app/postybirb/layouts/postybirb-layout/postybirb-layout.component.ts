import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material';
import { readFile, ReadFile } from 'src/app/utils/helpers/file-reader.helper';
import { CollectSubmissionInfoDialog } from '../../components/collect-submission-info-dialog/collect-submission-info-dialog.component';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { SubmissionFileDBService } from 'src/app/database/model-services/submission-file.service';
import { SubmissionType, ISubmission } from 'src/app/database/tables/submission.table';
import { SubmissionFileType } from 'src/app/database/tables/submission-file.table';
import { Submission } from 'src/app/database/models/submission.model';

export interface ModifiedReadFile extends ReadFile {
  title?: string;
  rating?: string;
  schedule?: Date;
}

@Component({
  selector: 'postybirb-layout',
  templateUrl: './postybirb-layout.component.html',
  styleUrls: ['./postybirb-layout.component.css']
})
export class PostybirbLayout implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef;
  public loading: boolean = false;
  public submissions: Submission[] = [];

  constructor(
    private _route: Router,
    private dialog: MatDialog,
    private _submissionDB: SubmissionDBService,
    private _submissionFileDBService: SubmissionFileDBService) { }

  ngOnInit() {
    this._submissionDB.getSubmissions()
    .then(submissions => this.submissions = submissions);
  }

  public createNewSubmission(submissionFiles: ReadFile[] = []): void {
    if (submissionFiles && submissionFiles.length) {
      this.dialog.open(CollectSubmissionInfoDialog, {
        data: submissionFiles,
        minWidth: '50vw'
      }).afterClosed()
        .subscribe((results: ModifiedReadFile[]) => {
          if (results && results.length) {
            this.loading = true;
            this._submissionDB.createSubmissions(
              <ISubmission[]>results.map(result => {
                return {
                  id: undefined,
                  title: result.title,
                  rating: result.rating,
                  schedule: null,
                  submissionType: SubmissionType.SUBMISSION
                }
              })
            ).then(insertResults => {
              // I assume insertResults comes down in orderBy id
              const promises: Promise<any>[] = [];
              for (let i = 0; i < insertResults.length; i++) {
                  promises.push(this._submissionFileDBService.createSubmissionFiles(insertResults[i].id, SubmissionFileType.PRIMARY_FILE, [results[i]]));
              }

              Promise.all(promises)
              .then(() => {
                this.loading = false;
              })
            });
          }
        });
    }
  }

  public createNewJournal(): void {

  }

  public createNewTemplate(): void {
    this._route.navigateByUrl('/template');
    // TODO implement actual template stuff
  }

  public filesSelected(event: Event): void {
    event.stopPropagation()
    event.preventDefault();
    this.loading = true;

    const files: File[] = event.target['files'];

    if (files && files.length) {
      const loadPromises: Promise<ReadFile>[] = [];
      for (let i = 0; i < files.length; i++) {
        loadPromises.push(readFile(files[i]));
      }

      Promise.all(loadPromises)
        .then(results => {
          this.loading = false;
          this.createNewSubmission(results);
        });
    }

    this.fileInput.nativeElement.value = '';
  }

}

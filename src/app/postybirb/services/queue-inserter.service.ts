import { Injectable } from '@angular/core';
import { PostQueueService } from './post-queue.service';
import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';
import { Submission } from 'src/app/database/models/submission.model';
import { MatDialog } from '@angular/material';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { SubmissionFileDBService } from 'src/app/database/model-services/submission-file.service';
import { SubmissionFileType } from 'src/app/database/tables/submission-file.table';
import { AdditionalImageSplitDialog } from '../components/additional-image-split-dialog/additional-image-split-dialog.component';
import { TabManager } from './tab-manager.service';

@Injectable({
  providedIn: 'root'
})
export class QueueInserterService {
  private websitesSupportingAdditional: string[] = [];

  constructor(
    private _postQueue: PostQueueService,
    private _submissionDB: SubmissionDBService,
    private _submissionFileDB: SubmissionFileDBService,
    private _tabManager: TabManager,
    private dialog: MatDialog
  ) {
    this.websitesSupportingAdditional = WebsiteRegistry.getRegisteredAsArray()
      .filter(entry => entry.websiteConfig.additionalFiles)
      .map(entry => entry.name);
  }

  public queue(submission: Submission, fromScheduler: boolean = false): void {
    if (submission) {
      if (submission.schedule && !fromScheduler) {
        submission.isScheduled = true;
        if (this._tabManager.hasTab(submission.id)) this._tabManager.removeTab(submission.id);
        this._postQueue._notify();
      } else {
        submission.isScheduled = false;
        this._postQueue.enqueue(submission);
      }
    }
  }

  public dequeue(submission: Submission): void {
    submission.queued = false;
    submission.isScheduled = false;
    this._postQueue.dequeue(submission.id);
  }


  // NOTE: Probably can be moved elsewhere
  public splitSubmission(submission: Submission): Promise<number> {
    return new Promise((resolve, reject) => {
      this.dialog.open(AdditionalImageSplitDialog, {
        data: submission
      }).afterClosed()
        .subscribe(shouldSplit => {
          if (shouldSplit) {
            let needsSplit: boolean = false;

            // split submission if allowed
            if (submission.fileMap.ADDITIONAL && submission.fileMap.ADDITIONAL.length) {
              for (let i = 0; i < submission.formData.websites.length; i++) {
                if (!this.websitesSupportingAdditional.includes(submission.formData.websites[i])) {
                  needsSplit = true;
                  break;
                }
              }
            }

            if (needsSplit) {
              const promises = [];
              for (let i = 0; i < submission.fileMap.ADDITIONAL.length; i++) {
                const imgId = submission.fileMap.ADDITIONAL[i];
                promises.push(this._split(submission, imgId))
              }
              Promise.all(promises)
                .then(submissions => resolve(submissions.length))
                .catch(() => resolve(0));
            } else {
              resolve(0);
            }
          } else {
            resolve(0);
          }
        });

    });
  }

  private async _split(submission: Submission, imgId: number): Promise<Submission> {
    const copy = submission.asISubmission();
    const newSubmission = new Submission(copy);
    let thumbnailId: number = null;
    if (typeof newSubmission.fileMap.THUMBNAIL === 'number') {
      thumbnailId = newSubmission.fileMap.THUMBNAIL;
    }
    newSubmission.formData.websites = newSubmission.formData.websites
      .filter(website => !this.websitesSupportingAdditional.includes(website));
    newSubmission.fileMap = null;

    const submissionToInsert = newSubmission.asISubmission();
    const [createdSubmission] = await this._submissionDB.createSubmissions([submissionToInsert]);
    const newPrimaryFile = await this._submissionFileDB.duplicateById(imgId, SubmissionFileType.PRIMARY_FILE, createdSubmission.id);
    let newThumbnailFile = null;
    if (thumbnailId !== null) {
      newThumbnailFile = await this._submissionFileDB.duplicateById(thumbnailId, SubmissionFileType.THUMBNAIL_FILE, createdSubmission.id);
    }

    const newFileMap = {
      ADDITIONAL: [],
      PRIMARY: newPrimaryFile.id,
      THUMBNAIL: thumbnailId ? newThumbnailFile.id : null
    }

    createdSubmission.fileInfo = newPrimaryFile.fileInfo;
    createdSubmission.fileMap = newFileMap;
    newSubmission.additionalFileInfo = [];

    return createdSubmission;
  }
}

import { Component, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import { PostyBirbSubmission } from '../../../../commons/models/posty-birb/posty-birb-submission';
import { GalleryService } from '../../../services/gallery-service/gallery.service';
import { GalleryStatus } from '../../../models/gallery-status.model';

@Component({
  selector: 'submission-card-container',
  templateUrl: './submission-card-container.component.html',
  styleUrls: ['./submission-card-container.component.css']
})
export class SubmissionCardContainerComponent implements OnDestroy {
  @Output() update: EventEmitter<PostyBirbSubmission[]> = new EventEmitter();

  public submissions: PostyBirbSubmission[] = [];
  public selectedSubmissions: PostyBirbSubmission[] = [];
  private gallerySubscription: Subscription;
  private readonly STORE: string = 'postybirb-in-progress-store';

  constructor(private galleryService: GalleryService) {
    this.gallerySubscription = galleryService.getObserver().subscribe((submission: PostyBirbSubmission) => {
      this.handleGalleryEvent(submission);
    });

    // Restore in progress work if any
    const archives: any[] = store.get(this.STORE) || [];
    if (archives.length > 0) {
      const restored: any[] = [];
      for (let i = 0; i < archives.length; i++) {
        restored.push(PostyBirbSubmission.fromArchive(archives[i]));
      }

      this.submissions = restored;
    }
  }

  ngOnDestroy() {
    if (this.gallerySubscription) this.gallerySubscription.unsubscribe();
    this.saveInProgress();
  }

  public saveInProgress(): void {
    // Save in progress work
    if (this.submissions.length > 0) {
      const save: any = [];
      for (let i = 0; i < this.submissions.length; i++) {
        const archive: any = this.submissions[i].asSubmissionArchive();
        if (archive.submissionFile.path) { // Only save if not from clipboard
          save.push(archive);
        }
      }

      store.set(this.STORE, save);
    } else {
      store.remove(this.STORE);
    }
  }


  private handleGalleryEvent(submission: PostyBirbSubmission): void {
    const status: GalleryStatus = submission.getGalleryStatus();

    if (status === GalleryStatus.COPY) {
      submission.setId(null);
      this.submissions.push(submission);
    } else if (status === GalleryStatus.EDITING) {
      const index = this.findSubmission(submission, this.submissions);
      if (index === -1) {
        this.submissions.push(submission);
      }
    } else if (status === GalleryStatus.SCHEDULE) {
      const index = this.findSubmission(submission, this.submissions);
      if (index !== -1) {
        this.submissions[index].setSchedule(submission.getSchedule());
      }
    } else if (status === GalleryStatus.DELETE) {
      this.submissionRemoved(submission);
    }
  }

  public submissionSelected(submission: PostyBirbSubmission): void {
    const index = this.findSubmission(submission, this.selectedSubmissions);

    if (index === -1) {
      this.selectedSubmissions.push(submission);
    } else {
      this.selectedSubmissions.splice(index, 1);
    }

    this.onUpdate();
  }

  public submissionRemoved(submission: PostyBirbSubmission): void {
    const index = this.findSubmission(submission, this.selectedSubmissions);
    const submissionIndex = this.findSubmission(submission, this.submissions);

    if (submissionIndex !== -1) {
      this.submissions.splice(submissionIndex, 1);
    }

    if (index !== -1) {
      this.selectedSubmissions.splice(index, 1);
      this.onUpdate();
    }

    this.saveInProgress();
  }

  private findSubmission(submission: PostyBirbSubmission, arr: PostyBirbSubmission[]): number {
    if (submission) {
      return arr.findIndex(s => s.getId() === submission.getId());
    }

    return -1;
  }

  public addFiles(newSubmissions: PostyBirbSubmission[] = []): void {
    for (let i = 0; i < newSubmissions.length; i++) {
      const s = newSubmissions[i];
      this.submissions.push(s);
    }

    this.saveInProgress();
  }

  public removeAll(): void {
    this.submissions = [];
    this.selectedSubmissions = [];
    this.onUpdate();

    this.saveInProgress();
  }

  public removeSelected(): void {
    this.submissions = this.submissions.filter(submission => !this.selectedSubmissions.includes(submission));
    this.selectedSubmissions = [];
    this.onUpdate();

    this.saveInProgress();
  }

  public removeUnselected(): void {
    this.submissions = [...this.selectedSubmissions];
    this.onUpdate();

    this.saveInProgress();
  }

  private onUpdate(): void {
    this.update.emit(this.selectedSubmissions || []);
    this.saveInProgress();
  }

  public dropForEdit(event: any): void {
    if (event.dragData) {
      this.galleryService.emit(event.dragData, GalleryStatus.EDITING);
    }
  }

}

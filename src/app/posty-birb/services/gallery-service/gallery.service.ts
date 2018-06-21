import { Injectable } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { GalleryStatus } from '../../models/gallery-status.model';
import { SubmissionStatus } from '../../enums/submission-status.enum';
import { PostyBirbSubmission, SubmissionArchive } from '../../../commons/models/posty-birb/posty-birb-submission';
import { FileInformation } from '../../../commons/models/file-information';
import { TranslateService } from '@ngx-translate/core';

import { SubmissionStoreService } from '../submission-store/submission-store.service';

@Injectable()
export class GalleryService {
  private gallerySubject: Subject<PostyBirbSubmission>;
  private scheduleClock: Subscription = Subscription.EMPTY;

  constructor(private storeService: SubmissionStoreService, private translate: TranslateService) {
    this.gallerySubject = new Subject<PostyBirbSubmission>();
    this.emitAll();
    this.startScheduleClock();
  }

  private emitAll(): void {
    const archives = this.storeService.getAll(true, true);
    for (let i = 0; i < archives.length; i++) {
      this.emit(archives[i], archives[i].meta.galleryStatus);
    }
  }

  private startScheduleClock(): void {
    this.stopScheduleClock();
    this.scheduleClock = Observable.interval(30000).subscribe(this.checkScheduledItems.bind(this));
  }

  private stopScheduleClock(): void {
    if (this.scheduleClock) {
      this.scheduleClock.unsubscribe();
    }
  }

  private isScheduleEnabled(): boolean {
    const isEnabled = store.get('scheduleEnabled');
    return isEnabled === undefined ? true : isEnabled;
  }

  private checkScheduledItems(): void {
    if (!this.isScheduleEnabled()) return;

    const now: Date = new Date();
    const scheduledSubmissions: SubmissionArchive[] = this.storeService.getAll(false, true);
    if (scheduledSubmissions.length > 0) {
      scheduledSubmissions.forEach((item) => {
        const schedule = item.meta.schedule;
        if (schedule) {
          const scheduledTime: Date = new Date(schedule);
          if (now >= scheduledTime) {
            this.emit(item, GalleryStatus.QUEUED);
          }
        }
      });
    }
  }

  public getObserver(): Observable<PostyBirbSubmission> {
    return this.gallerySubject.asObservable();
  }

  public post(submission: PostyBirbSubmission): void {
    submission.setGalleryStatus(GalleryStatus.QUEUED);
    this.gallerySubject.next(submission);
  }

  public emit(submission: SubmissionArchive | PostyBirbSubmission, status: GalleryStatus, forcedFile: FileInformation = null): void {
    let emitted: PostyBirbSubmission = null;
    if (submission instanceof PostyBirbSubmission) {
      emitted = PostyBirbSubmission.fromArchive(submission.asSubmissionArchive());
    } else {
      emitted = PostyBirbSubmission.fromArchive(submission);
    }

    emitted.setGalleryStatus(status);
    if (forcedFile) emitted.setSubmissionFile(forcedFile);

    this.gallerySubject.next(emitted);
  }

  public submit(newSubmission: PostyBirbSubmission, status: GalleryStatus): void {
    newSubmission.setGalleryStatus(status);
    const archive: SubmissionArchive = newSubmission.asSubmissionArchive();

    if (status !== GalleryStatus.COPY) {
      this.storeService.update(archive);
    }

    this.emit(archive, status, newSubmission.getSubmissionFile());
  }

  public scheduleSubmission(submission: PostyBirbSubmission, time: Date): void {
    submission.setSchedule(time ? time : undefined);
    submission.setOrder(this.storeService.getSize(true, false));
    this.submit(submission, GalleryStatus.SCHEDULE);
  }

  public delete(submission: PostyBirbSubmission): void {
    this.emit(this.storeService.delete(submission.getId(), true), GalleryStatus.DELETE);
  }

  public updateOrder(submissions: PostyBirbSubmission[]): void {
    this.storeService.updateAll(submissions.map(s => { return s.asSubmissionArchive() }));
  }

  public getUnscheduled(): Array<PostyBirbSubmission> {
    return this.storeService.getAll(true, false).map(archive => {
      return PostyBirbSubmission.fromArchive(archive);
    });
  }

  public getScheduled(): Array<PostyBirbSubmission> {
    return this.storeService.getAll(false, true).map(archive => {
      return PostyBirbSubmission.fromArchive(archive);
    });
  }

  public submissionPosted(submission: PostyBirbSubmission): void {
    if (submission.getUnpostedWebsites().length === 0) {
      submission.setSubmissionStatus(SubmissionStatus.POSTED);
      submission.getSubmissionFileSource().then(src => {
        this.translate.get('Submission Posted').subscribe(title => {
          this.translate.get('Submission posted message', { value: submission.getTitle() }).subscribe(msg => {
            new Notification(title, {
              body: msg,
              icon: src
            });

            this.delete(submission);
          });
        });
      }).catch(() => {
        this.delete(submission);
      });
    } else { //Any failed go to unscheduled gallery
      submission.getSubmissionFileSource().then(src => {
        this.translate.get('Submission Failed').subscribe((title) => {
          this.translate.get('Submission failed message', { value: submission.getTitle() }).subscribe((msg) => {
            new Notification(title, {
              body: msg,
              icon: src
            });
          });
        });
      });

      submission.setSubmissionStatus(SubmissionStatus.FAILED);
      this.scheduleSubmission(submission, null);
    }
  }

  public clearScheduledSubmissions(): void {
    this.storeService.clear(false, true);
  }

  public clearUnscheduledSubmissions(): void {
    this.storeService.clear(true, false);
  }
}

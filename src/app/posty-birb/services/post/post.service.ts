import { Injectable } from '@angular/core';
import { Observable, Subscription, Subject } from 'rxjs';
import { GalleryService } from '../gallery-service/gallery.service';
import { GalleryStatus } from '../../models/gallery-status.model';
import { SubmissionStatus } from '../../enums/submission-status.enum';
import { PostyBirbSubmission } from '../../../commons/models/posty-birb/posty-birb-submission';

@Injectable()
export class PostService {
  private postQueue: PostyBirbSubmission[];
  private gallerySubscriber: Subscription = Subscription.EMPTY;
  private notifySubect: Subject<PostyBirbSubmission>;
  private notifyObservable: Observable<PostyBirbSubmission>;

  constructor(private galleryService: GalleryService) {
    this.postQueue = [];
    this.notifySubect = new Subject<PostyBirbSubmission>();
    this.notifyObservable = this.notifySubect.asObservable();

    this.gallerySubscriber = galleryService.getObserver()
      .subscribe((item) => {
        const status: GalleryStatus = item.getGalleryStatus();
        if (status === GalleryStatus.QUEUED) {
          if (item.getSubmissionStatus() !== SubmissionStatus.POSTED && item.getUnpostedWebsites().length > 0) {
            this.queueSubmission(item);
          }
        } else if (status === GalleryStatus.CANCEL || GalleryStatus.DELETE) {
          this.removeSubmission(item);
        }
      });
  }

  private queueSubmission(item: PostyBirbSubmission): void {
    //Item exists
    if (item) {
      const index = this.searchQueue(item);

      //Push into queue for posting
      if (index !== -1) {
        this.postQueue[index] = item;
      } else {
        this.postQueue.push(item);
      }

      this.notifySubect.next(item);
    }
  }

  public removeSubmission(item: PostyBirbSubmission): void {
    const index = this.searchQueue(item);
    if (index !== -1) {
      this.postQueue.splice(index, 1);
    }
  }

  private searchQueue(item: PostyBirbSubmission): number {
    for (let i = 0; i < this.postQueue.length; i++) {
      if (this.postQueue[i].getId() === item.getId()) {
        return i;
      }
    }

    return -1;
  }

  public pop(): PostyBirbSubmission {
    return this.postQueue.shift() || null;
  }

  public getQueueCount(): number {
    return this.postQueue.length;
  }

  public getObserver(): Observable<PostyBirbSubmission> {
    return this.notifyObservable;
  }

  public clearQueue(): void {
    this.postQueue = [];
  }
}

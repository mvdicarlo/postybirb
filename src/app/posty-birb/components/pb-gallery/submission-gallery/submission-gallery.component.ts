import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { GalleryService } from '../../../services/gallery-service/gallery.service';
import { PostService } from '../../../services/post/post.service';
import { MatDialog, MatDialogRef } from '@angular/material';
import { ConfirmDialogComponent } from '../../../../commons/components/confirm-dialog/confirm-dialog.component';
import { GalleryStatus } from '../../../models/gallery-status.model';
import { PostyBirbSubmission } from '../../../../commons/models/posty-birb/posty-birb-submission';

@Component({
  selector: 'submission-gallery',
  templateUrl: './submission-gallery.component.html',
  styleUrls: ['./submission-gallery.component.css']
})
export class SubmissionGalleryComponent implements OnInit, OnDestroy {
  private gallerySubscriber: Subscription;
  unscheduledSubmissions: PostyBirbSubmission[] = [];
  scheduledSubmissions: PostyBirbSubmission[] = [];

  constructor(private dialog: MatDialog, private galleryService: GalleryService, private postService: PostService) {
    this.gallerySubscriber = galleryService.getObserver().subscribe((submission: PostyBirbSubmission) => {
      const status = submission.getGalleryStatus();
      if (status === GalleryStatus.NEW || status === GalleryStatus.UPDATE || status === GalleryStatus.SCHEDULE) {
        if (!submission.isScheduled()) {
          this.deleteSubmission(submission, this.scheduledSubmissions);
          this.handleUnscheduledSubmission(submission);
        } else {
          this.deleteSubmission(submission, this.unscheduledSubmissions);
          this.handleScheduledSubmission(submission);
        }
      } else if (status === GalleryStatus.DELETE) {
        this.deleteSubmission(submission, this.unscheduledSubmissions);
        this.deleteSubmission(submission, this.scheduledSubmissions);
      }
    });
  }

  ngOnInit() {
    this.unscheduledSubmissions = this.sort(this.galleryService.getUnscheduled());
    this.scheduledSubmissions = this.galleryService.getScheduled();
  }

  ngOnDestroy() {
    this.gallerySubscriber.unsubscribe();
  }

  private reorderItems(event: any): void {
    const { originalItem, movedItem } = event;

    let galleryArray = this.unscheduledSubmissions;
    const index = this.searchForItem(movedItem, galleryArray);
    if (index !== -1) {
      galleryArray[index].setOrder(originalItem.getOrder() - 0.01);
      galleryArray = this.sort(galleryArray)
      this.unscheduledSubmissions = [...galleryArray];
      this.galleryService.updateOrder([...galleryArray]);
    }
  }

  private handleUnscheduledSubmission(item: PostyBirbSubmission): void {
    let updateArray: PostyBirbSubmission[] = this.unscheduledSubmissions;
    const index = this.searchForItem(item, updateArray);
    if (index !== -1) {
      item.setOrder(updateArray[index].getOrder());
      updateArray[index] = item;
    } else if (index === -1 && item.getGalleryStatus() === GalleryStatus.NEW) {
      item.setOrder(updateArray.length);
      updateArray.push(item);
    } else if (item.getGalleryStatus() === GalleryStatus.SCHEDULE) {
      item.setOrder(updateArray.length);
      updateArray.push(item);
    }

    updateArray = this.sort(updateArray);
    this.unscheduledSubmissions = [...updateArray];
    this.galleryService.updateOrder(this.unscheduledSubmissions);
  }

  private handleScheduledSubmission(item: PostyBirbSubmission): void {
    let updateArray: PostyBirbSubmission[] = this.scheduledSubmissions;
    const index = this.searchForItem(item, updateArray);
    if (index !== -1) {
      item.setOrder(updateArray[index].getOrder());
      updateArray[index] = item;
    } else if (index === -1 && item.getGalleryStatus() === GalleryStatus.NEW) {
      item.setOrder(updateArray.length);
      updateArray.push(item);
    } else if (item.getGalleryStatus() === GalleryStatus.SCHEDULE) {
      item.setOrder(updateArray.length);
      updateArray.push(item);
    }

    this.scheduledSubmissions = [...updateArray];
  }

  private deleteSubmission(item: PostyBirbSubmission, gallery: any): void {
    const index = this.searchForItem(item, gallery);
    if (index !== -1) {
      gallery.splice(index, 1);
      if (gallery === undefined) {
        gallery = [];
      }
      gallery = [...gallery];
    }
  }

  public isScheduledEnabled(): boolean {
    const isEnabled = store.get('scheduleEnabled');
    return isEnabled === undefined ? true : isEnabled;
  }

  public toggleScheduleEnabled(event: any): void {
    store.set('scheduleEnabled', event.checked);
  }

  sort(items: PostyBirbSubmission[]): PostyBirbSubmission[] {
    let arr = items;
    arr = arr.sort((a, b) => {
      if (a.getOrder() < b.getOrder()) {
        return -1;
      } else if (a.getOrder() > b.getOrder()) {
        return 1;
      } else {
        return 0;
      }
    });

    for (let i = 0; i < arr.length; i++) {
      arr[i].setOrder(i);
    }

    return arr;
  }

  searchForItem(searchItem: PostyBirbSubmission, gallery: PostyBirbSubmission[] = []): number {
    for (let i = 0; i < gallery.length; i++) {
      const item: PostyBirbSubmission = gallery[i];
      if (item.getId() === searchItem.getId()) {
        return i;
      }
    }

    return -1;
  }

  postAll(): void {
    if (this.unscheduledSubmissions.length > 0) {
      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Post All'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.unscheduledSubmissions.forEach((item) => {
            this.galleryService.post(item);
          });
        }
      });
    }
  }

  clearAll(): void {
    const copy = [...this.unscheduledSubmissions];
    if (copy.length > 0) {
      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: { title: 'Deleta All' }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          copy.forEach((item) => {
            this.galleryService.delete(item);
          });
        }
      });
    }
  }

}

import { Injectable } from '@angular/core';
import { Subscription, Subject } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material';
import { PostDialogComponent } from '../../components/dialog/post-dialog/post-dialog.component';
import { PostService } from '../post/post.service';
import { GalleryService } from '../gallery-service/gallery.service';

@Injectable()
export class PostObserverService {

  private postDialog: MatDialogRef<PostDialogComponent>;

  constructor(private postService: PostService, private dialog: MatDialog, private galleryService: GalleryService) {

    postService.getObserver().subscribe((item) => {
      if (item) {
        this.openDialog();
      }
    });
  }

  private openDialog(): void {
    if (!this.postDialog) {
      this.postDialog = this.dialog.open(PostDialogComponent, {
        disableClose: true,
        height: '90%',
        width: '90%',
        data: { callback: this.handleReply.bind(this), submissionItem: this.postService.pop() }
      });

      this.postDialog.afterClosed().subscribe(result => {
        this.postService.clearQueue();
      }, (err) => {
        this.postDialog = null;
        this.postService.clearQueue();
      }, () => {
        this.postDialog = null;
      });
    }
  }

  private handleReply(reply: any): any {
    if (reply && reply.submission) {
      this.postService.removeSubmission(reply.submission);
      this.galleryService.submissionPosted(reply.submission);
    }

    // this.communicator.say(this.postService.pop(), 100);
    return this.postService.pop();
  }

}

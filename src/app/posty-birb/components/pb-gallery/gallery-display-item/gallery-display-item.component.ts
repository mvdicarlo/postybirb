import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { GalleryStatus } from '../../../models/gallery-status.model';
import { SubmissionStatus } from '../../../enums/submission-status.enum';
import { MatDialog, MatDialogRef } from '@angular/material';
import { ConfirmDialogComponent } from '../../../../commons/components/confirm-dialog/confirm-dialog.component';
import { ScheduleSubmissionDialogComponent } from '../../dialog/schedule-submission-dialog/schedule-submission-dialog.component';
import { SubmissionViewComponent } from '../../dialog/submission-view/submission-view.component';
import { GalleryService } from '../../../services/gallery-service/gallery.service';
import { PostyBirbSubmission } from '../../../../commons/models/posty-birb/posty-birb-submission';
import { FileInformation } from '../../../../commons/models/file-information';

@Component({
  selector: 'gallery-display-item',
  templateUrl: './gallery-display-item.component.html',
  styleUrls: ['./gallery-display-item.component.css']
})
export class GalleryDisplayItemComponent implements OnInit {
  @Input() item: PostyBirbSubmission;
  @Input() dragScope: string;
  @Output() reorder: EventEmitter<any> = new EventEmitter();

  public file: any;
  public src: string;
  public title: string;
  public status: string;
  public schedule: Date;

  constructor(private dialog: MatDialog, private galleryService: GalleryService) { }

  ngOnInit() {
    this.file = this.item.getSubmissionFileObject();
    this.title = this.item.getTitle();
    this.status = this.item.getSubmissionStatus();
    this.schedule = this.item.getSchedule();
    this.getFileSrc().then(src => this.src = src || '');
  }

  public getFileSrc(): Promise<string> {
    return this.item.getSubmissionFileSource();
  }

  public onItemDrop(event: any): void {
    const dragItem: PostyBirbSubmission = event.dragData;

    if (dragItem && dragItem !== this.item) {
      this.reorder.emit({ originalItem: this.item, movedItem: dragItem });
    }
  }

  public deleteItem(): void {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.galleryService.delete(this.item);
      }
    });
  }

  public editItem(): void {
    this.galleryService.submit(this.item, GalleryStatus.EDITING);
  }

  public postItem(): void {
    if (this.item.getSubmissionStatus() !== SubmissionStatus.POSTED) {
      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: { title: 'Post' }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.galleryService.post(this.item);
        }
      });
    }
  }

  public copyItem(): void {
    this.galleryService.submit(this.item, GalleryStatus.COPY);
  }

  public openSummary(): void {
    this.dialog.open(SubmissionViewComponent, {
      data: this.item,
      width: '80%'
    });
  }

  public scheduleItem(): void {
    if (this.item.getSubmissionStatus() !== SubmissionStatus.POSTED) {
      let dialogRef: MatDialogRef<ScheduleSubmissionDialogComponent>;
      dialogRef = this.dialog.open(ScheduleSubmissionDialogComponent, {
        data: this.item
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.galleryService.scheduleSubmission(result, result.getSchedule());
        }
      });
    }
  }

  public isPosted() {
    return this.item.getSubmissionStatus() === SubmissionStatus.POSTED;
  }

}

import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'journal-post-dialog',
  templateUrl: './journal-post-dialog.component.html',
  styleUrls: ['./journal-post-dialog.component.css']
})
export class JournalPostDialogComponent implements OnInit {
  private postCount: number = 0;
  private failedWebsites: string[] = [];
  public selectedWebsites: string[] = [];

  constructor( @Inject(MAT_DIALOG_DATA) public data: any, private dialogRef: MatDialogRef<JournalPostDialogComponent>) { }

  ngOnInit() {
    this.selectedWebsites = this.data.selectedWebsites || [];
  }

  public submitComplete(event: any): void {
    if (!event.success) {
      this.failedWebsites.push(event.website);
    }

    this.postCount++;

    if (this.postCount === this.selectedWebsites.length) {
      this.close();
    }
  }

  private close(): void {
    this.dialogRef.close(this.failedWebsites);
  }

}

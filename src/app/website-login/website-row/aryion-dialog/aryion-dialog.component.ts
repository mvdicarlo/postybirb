import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'aryion-dialog',
  templateUrl: './aryion-dialog.component.html',
  styleUrls: ['./aryion-dialog.component.css']
})
export class AryionDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}

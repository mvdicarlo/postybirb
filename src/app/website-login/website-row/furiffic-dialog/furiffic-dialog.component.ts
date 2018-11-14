import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'furiffic-dialog',
  templateUrl: './furiffic-dialog.component.html',
  styleUrls: ['./furiffic-dialog.component.css']
})
export class FurifficDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}

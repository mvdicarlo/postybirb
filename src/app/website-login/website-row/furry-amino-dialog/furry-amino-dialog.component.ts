import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'furry-amino-dialog',
  templateUrl: './furry-amino-dialog.component.html',
  styleUrls: ['./furry-amino-dialog.component.css']
})
export class FurryAminoDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}

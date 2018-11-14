import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'route50-dialog',
  templateUrl: './route50-dialog.component.html',
  styleUrls: ['./route50-dialog.component.css']
})
export class Route50DialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}

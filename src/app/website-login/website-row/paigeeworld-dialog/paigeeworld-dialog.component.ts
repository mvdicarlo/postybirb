import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'paigeeworld-dialog',
  templateUrl: './paigeeworld-dialog.component.html',
  styleUrls: ['./paigeeworld-dialog.component.css']
})
export class PaigeeworldDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }

}

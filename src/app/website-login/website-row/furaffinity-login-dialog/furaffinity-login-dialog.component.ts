import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'furaffinity-login-dialog',
  templateUrl: './furaffinity-login-dialog.component.html',
  styleUrls: ['./furaffinity-login-dialog.component.css']
})
export class FuraffinityLoginDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}

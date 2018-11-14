import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'patreon-dialog',
  templateUrl: './patreon-dialog.component.html',
  styleUrls: ['./patreon-dialog.component.css']
})
export class PatreonDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}

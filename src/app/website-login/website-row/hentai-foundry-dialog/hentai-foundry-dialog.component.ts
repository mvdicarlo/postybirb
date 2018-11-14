import { Component, AfterContentInit } from '@angular/core';

@Component({
  selector: 'app-hentai-foundry-dialog',
  templateUrl: './hentai-foundry-dialog.component.html',
  styleUrls: ['./hentai-foundry-dialog.component.css']
})
export class HentaiFoundryDialogComponent implements AfterContentInit {
  public show: boolean = false;

  ngAfterContentInit() {
    setTimeout(() => this.show = true, 150);
  }
}

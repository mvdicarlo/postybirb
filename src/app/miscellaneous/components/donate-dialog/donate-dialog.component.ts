import { Component } from '@angular/core';

@Component({
  selector: 'donate-dialog',
  templateUrl: './donate-dialog.component.html',
  styleUrls: ['./donate-dialog.component.css']
})
export class DonateDialogComponent {

  public openPayPal() {
    window['openUrlInBrowser']('http://paypal.me/mvdicarlo');
  }

}

import { Component } from '@angular/core';

@Component({
  selector: 'contact-dialog',
  templateUrl: './contact-dialog.component.html',
  styleUrls: ['./contact-dialog.component.css']
})
export class ContactDialogComponent {

  public openContactPage() {
    window['openUrlInBrowser']('http://www.postybirb.com/contact.html')
  }

  public openFuraffinity() {
    window['openUrlInBrowser']('https://www.furaffinity.net/user/lemonynade');
  }

  public openTwitter() {
    window['openUrlInBrowser']('https://twitter.com/@minnownade');
  }

  public openDiscord() {
    window['openUrlInBrowser']('https://discord.gg/jK5JQJF');
  }
}

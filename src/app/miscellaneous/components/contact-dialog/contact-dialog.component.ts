import { Component } from '@angular/core';

@Component({
  selector: 'contact-dialog',
  templateUrl: './contact-dialog.component.html',
  styleUrls: ['./contact-dialog.component.css']
})
export class ContactDialogComponent {

  public openContactPage() {
    openUrlInBrowser('http://www.postybirb.com/contact.html')
  }

  public openFuraffinity() {
    openUrlInBrowser('https://www.furaffinity.net/user/lemonynade');
  }

  public openTwitter() {
    openUrlInBrowser('https://twitter.com/@minnownade');
  }

  public openDiscord() {
    openUrlInBrowser('https://discord.gg/jK5JQJF');
  }
}

import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, Input } from '@angular/core';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';

@Component({
  selector: 'title-truncate-display',
  templateUrl: './title-truncate-display.component.html',
  styleUrls: ['./title-truncate-display.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.d-none]': '!shouldShow'
  }
})
export class TitleTruncateDisplayComponent implements OnInit {
  @Input()
  get websites(): string[] { return this._websites }
  set websites(websites: string[]) {
    this._websites = websites || [];
    if (!this._websites.length) this.shouldShow = false;
    this._changeDetector.markForCheck();
  }
  private _websites: string[] =  [];

  @Input()
  get title(): string { return this._title }
  set title(title: string) {
    this._title = title || '';
    if (!this.title.length) this.shouldShow = false;
    this._changeDetector.markForCheck();
  }
  private _title: string = '';

  private shouldShow: boolean = false;

  private websiteRules: any = {
    [SupportedWebsites.Pixiv]: 32,
    [SupportedWebsites.Furiffic]: 30
  };

  constructor(private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
  }

  public getTruncated(): any[] {
    if (!this.title.length || !this.websites.length) {
      this.shouldShow = false;
      return [];
    }

    const truncated: any[] = [];
    this.websites.forEach(website => {
      const rules: number = this.websiteRules[website];
      if (rules < this.title.length) {
        truncated.push({
          website,
          title: this.title.substring(0, rules),
          maxLength: rules
        });
      }
    });

    if (truncated.length) this.shouldShow = true;

    return truncated;
  }

}

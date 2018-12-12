import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WebsiteCoordinatorService } from '../../../commons/services/website-coordinator/website-coordinator.service';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'mastodon-dialog',
  templateUrl: './mastodon-dialog.component.html',
  styleUrls: ['./mastodon-dialog.component.css']
})
export class MastodonDialogComponent implements OnInit {
  @ViewChild('webview') webview: ElementRef;
  private mastodon: any;
  public failed: boolean;
  public websiteForm: FormGroup;
  public url: string = 'https://mastodon.social';
  public loading: boolean = false;

  constructor(private service: WebsiteCoordinatorService, private dialogRef: MatDialogRef<MastodonDialogComponent>, fb: FormBuilder) {
    this.mastodon = window['mastodon'];
    this.websiteForm = fb.group({
      url: ['mastodon', Validators.required],
      extension: ['social', Validators.required]
    });
  }

  ngOnInit() {
    this.failed = false;
    this._setUrlData();
    this.webview.nativeElement.addEventListener('did-start-loading', () => { this.loading = true })
    this.webview.nativeElement.addEventListener('did-stop-loading', () => { this.loading = false })
    this.service.authorizeWebsite(SupportedWebsites.Mastodon, { site: this.url }).then((url) => {
      this.webview.nativeElement.src = url;
    });
  }

  public changeURL(): void {
    if (this.websiteForm.valid) {
      this.url = this._buildURL();
      this.loading = true;
      this.service.authorizeWebsite(SupportedWebsites.Mastodon, { site: this.url }).then((url) => {
        this.webview.nativeElement.src = url;
        this.loading = false;
      });
    }
  }

  private _buildURL(): string {
    try {
      const vals = this.websiteForm.value;
      let url = 'https://';

      let extension: string = vals.extension.split('/')[0].trim();
      extension = extension.replace('.', '');

      let siteName: string = vals.url.replace(/(https:\/\/|www\.)/g, '').replace(/\//g, '').trim();

      return `${url}${siteName}.${extension}`;
    } catch (e) {
      return 'https://mastodon.social';
    }
  }

  private _setUrlData(): void {
    const storedToken = db.get('mastodon').value();
    try {
      if (storedToken) {
        let website: string = storedToken.site;
        website = website.replace(/(https:\/\/|www\.)/g, '');
        const parts: string[] = website.split('.');
        if (parts.length < 2) { // for old stuff
          this.url = `https://mastodon.${parts[0] || 'social'}`;
          this.websiteForm.patchValue({ url: 'mastodon', extension: parts[0] || 'social' }, { emitEvent: false });
        } else {
          this.url = `https://${parts[0] || 'mastodon'}.${parts[1] || 'social'}`;
          this.websiteForm.patchValue({ url: parts[0] || 'mastodon', extension: parts[1] || 'social' }, { emitEvent: false });
        }
      }
    } catch (e) {
      // unknown what to do here yet
    }
  }

  public submitCode(code: string): void {
    this.service.authorizeWebsite(SupportedWebsites.Mastodon, { code, site: this.url }).then(function() {
      this.failed = false;
      this.dialogRef.close();
    }.bind(this), function() {
      this.failed = true;
    }.bind(this));
  }

  public unauthorize() {
    this.service.unauthorizeWebsite(SupportedWebsites.Mastodon);
    this.ngOnInit();
  }
}

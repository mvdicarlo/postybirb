import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { MAT_DIALOG_DATA } from '@angular/material';
import { GenericLoginDialogOptions } from 'src/app/websites/components/generic-login-dialog/generic-login-dialog.component';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { LoginStatus } from 'src/app/websites/interfaces/website-service.interface';

@Component({
  selector: 'mastodon-login-dialog',
  templateUrl: './mastodon-login-dialog.component.html',
  styleUrls: ['./mastodon-login-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'login-dialog'
  }
})
export class MastodonLoginDialog implements OnInit, AfterViewInit {
  @ViewChild('webview') webview: ElementRef;
  public loginForm: FormGroup;
  public url: string = 'https://mastodon.social';
  public loading: boolean = false;
  public failed: boolean = false;
  public authorized: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: GenericLoginDialogOptions,
    fb: FormBuilder,
    private _loginManager: LoginManagerService,
    private _profileManager: LoginProfileManagerService,
    private _changeDetector: ChangeDetectorRef
  ) {
    this.loginForm = fb.group({
      url: ['mastodon', Validators.required],
      extension: ['social', Validators.required]
    });
  }

  ngOnInit() {
    this.authorized = this._loginManager.getLoginStatus(this.data.persist, 'Mastodon') === LoginStatus.LOGGED_IN;
    this._setUrlData();
  }

  ngAfterViewInit() {
    this.webview.nativeElement.partition = `persist:${this.data.persist}`;
    this.webview.nativeElement.addEventListener('did-start-loading', () => {
      this.loading = true;
      this._changeDetector.markForCheck();
    });

    this.webview.nativeElement.addEventListener('did-stop-loading', () => {
      this.loading = false;
      this._changeDetector.markForCheck();
    });

    this.auth();
  }

  private _buildURL(): string {
    try {
      const vals = this.loginForm.value;
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
    const info = this._profileManager.getData(this.data.persist, 'Mastodon');
    try {
      if (info) {
        let website: string = info.website;
        website = website.replace(/(https:\/\/|www\.)/g, '');
        const parts: string[] = website.split('.');
        if (parts.length < 2) { // for old stuff
          this.url = `https://mastodon.${parts[0] || 'social'}`;
          this.loginForm.patchValue({ url: 'mastodon', extension: parts[0] || 'social' }, { emitEvent: false });
        } else {
          this.url = `https://${parts[0] || 'mastodon'}.${parts[1] || 'social'}`;
          this.loginForm.patchValue({ url: parts[0] || 'mastodon', extension: parts[1] || 'social' }, { emitEvent: false });
        }
      }
    } catch (e) {
      // unknown what to do here yet
    }

    this._changeDetector.markForCheck();
  }

  public auth() {
    this.failed = false;
    this._setUrlData();
    this.webview.nativeElement.src = auth.mastodon.getAuthorizationURL(this.url);
    this._changeDetector.markForCheck();
  }

  public changeURL(): void {
    if (this.loginForm.valid) {
      this.url = this._buildURL();
      this.loading = true;
      this.webview.nativeElement.src = auth.mastodon.getAuthorizationURL(this.url);
      const info = this._profileManager.getData(this.data.persist, 'Mastodon') || {};
      if (info.website !== this.url) {
        this.authorized = false;
      } else if (info.token) {
        this.authorized = true;
      }
      this._changeDetector.markForCheck();
    }
  }

  public submitCode(code: string): void {
    auth.mastodon.authorize(this.url, code)
      .then(function(auth) {
        this.failed = false;
        this._profileManager.storeData(this.data.persist, 'Mastodon', auth);
        this.authorized = true;
      }.bind(this))
      .catch(function() {
        this.failed = true;
      }.bind(this)).finally(function() {
        this._changeDetector.markForCheck();
      }.bind(this))
  }

}

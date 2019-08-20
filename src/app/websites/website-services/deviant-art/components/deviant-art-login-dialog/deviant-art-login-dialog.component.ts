import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, Inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { GenericLoginDialogOptions } from 'src/app/websites/components/generic-login-dialog/generic-login-dialog.component';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { LoginStatus } from 'src/app/websites/interfaces/website-service.interface';

@Component({
  selector: 'deviant-art-login-dialog',
  templateUrl: './deviant-art-login-dialog.component.html',
  styleUrls: ['./deviant-art-login-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'login-dialog'
  }
})
export class DeviantArtLoginDialog implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('webview') webview: ElementRef;

  public loggedIn: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: GenericLoginDialogOptions,
    private _changeDetector: ChangeDetectorRef,
    private _loginManager: LoginManagerService,
    private _loginProfileManager: LoginProfileManagerService
  ) { }

  ngOnInit() {
    auth.deviantart.start(this.authorize.bind(this));
    this.loggedIn = this._loginManager.getLoginStatus(this.data.persist, 'DeviantArt') === LoginStatus.LOGGED_IN;
  }

  ngAfterViewInit() {
    this.webview.nativeElement.partition = `persist:${this.data.persist}`;
    this.webview.nativeElement.src = auth.deviantart.getAuthURL();

    // HACK: A workaround for authenticating a user that just logged in due
    // Currently needed because DA broke the redirect when logging in.
    // DATE: 08/19/2019
    this.webview.nativeElement.addEventListener('did-navigate', event => {
      if (event.url.includes('loggedin')) {
        this.webview.nativeElement.src = auth.deviantart.getAuthURL();
      }
    });
  }

  ngOnDestroy() {
    auth.deviantart.stop();
  }

  public authorize(data: any): void {
    if (data) {
      this._loginProfileManager.storeData(this.data.persist, 'DeviantArt', data);
      this.loggedIn = true;
      this._changeDetector.detectChanges();
    } else {
      this.unauthorize();
    }
  }

  public unauthorize(): void {
    const cookieSession = getCookieAPI(this.data.persist);
    cookieSession.get({
      url: 'https://www.deviantart.com'
    }, (err, cookies) => {
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        cookieSession.remove('https://www.deviantart.com', cookie.name, (err) => {
          if (err) console.error(err);
        });
      }
    });

    this.loggedIn = false;
    this._loginProfileManager.storeData(this.data.persist, 'DeviantArt', null);
    this.webview.nativeElement.src = auth.deviantart.getAuthURL();
    this._changeDetector.detectChanges();
  }

}

import { Component, OnInit, Inject, ChangeDetectorRef, ChangeDetectionStrategy, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { GenericLoginDialogOptions } from 'src/app/websites/components/generic-login-dialog/generic-login-dialog.component';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { LoginStatus } from 'src/app/websites/interfaces/website-service.interface';

@Component({
  selector: 'tumblr-login-dialog',
  templateUrl: './tumblr-login-dialog.component.html',
  styleUrls: ['./tumblr-login-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'login-dialog'
  }
})
export class TumblrLoginDialog implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('webview') webview: ElementRef;

  public loggedIn: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: GenericLoginDialogOptions,
    private _changeDetector: ChangeDetectorRef,
    private _loginManager: LoginManagerService,
    private _loginProfileManager: LoginProfileManagerService,
  ) { }

  ngOnInit() {
    auth.tumblr.start(this.authorize.bind(this));
    this.loggedIn = this._loginManager.getLoginStatus(this.data.persist, 'Tumblr') === LoginStatus.LOGGED_IN;
  }

  ngAfterViewInit() {
    this.webview.nativeElement.partition = `persist:${this.data.persist}`;
    this.webview.nativeElement.src = auth.tumblr.getAuthURL();
  }

  ngOnDestroy() {
    auth.tumblr.stop();
  }

  private authorize(data: any): void {
    if (data) {
      this._loginProfileManager.storeData(this.data.persist, 'Tumblr', data);
      this.loggedIn = true;
      this._changeDetector.markForCheck();
    }
  }

  public unauthorize(): void {
    this.loggedIn = false;
    this._loginProfileManager.storeData(this.data.persist, 'Tumblr', null);
    this.webview.nativeElement.src = auth.tumblr.getAuthURL();
    this._changeDetector.markForCheck();
  }

}

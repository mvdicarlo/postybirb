import { Component, OnInit, Inject, ChangeDetectorRef, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { GenericLoginDialogOptions } from 'src/app/websites/components/generic-login-dialog/generic-login-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { Twitter } from '../../twitter.service';

@Component({
  selector: 'twitter-login-dialog',
  templateUrl: './twitter-login-dialog.component.html',
  styleUrls: ['./twitter-login-dialog.component.css']
})
export class TwitterLoginDialog implements OnInit, OnDestroy {
  @ViewChild('webview') webview: ElementRef;

  public loggedIn: boolean = false;
  public attempting: boolean = false;

  public loginForm: FormGroup;

  private code: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: GenericLoginDialogOptions,
    fb: FormBuilder,
    private _changeDetector: ChangeDetectorRef,
    private _loginManager: LoginManagerService,
    private _loginProfileManager: LoginProfileManagerService,
    private dialogRef: MatDialogRef<TwitterLoginDialog>
  ) {
    this.loginForm = fb.group({
      pin: [null, Validators.required],
    });
  }

  ngOnInit() {
    auth.twitter.start();
  }

  ngAfterViewInit() {
    this.webview.nativeElement.partition = `persist:${this.data.persist}`;
    this.webview.nativeElement.src = auth.twitter.getAuthURL();
  }

  ngOnDestroy() {
    auth.twitter.stop();
  }

  public authorize(): void {
    this.attempting = true;
    this._changeDetector.markForCheck();

    auth.twitter.authorizePIN(this.loginForm.value.pin)
      .then(oauths => {
        const oauth = {
          token: oauths.accessToken,
          secret: oauths.accessTokenSecret,
          username: oauths.results.screen_name,
        };

        this._loginProfileManager.storeData(this.data.persist, Twitter.name, oauth);
        this.loggedIn = true;
        this.attempting = false;
        this._changeDetector.markForCheck();
      })
      .catch(() => {
        this.attempting = false;
        this._changeDetector.markForCheck();
      });
  }

  public unauthorize(): void {
    this.loggedIn = false;
    this._loginProfileManager.storeData(this.data.persist, Twitter.name, null);
    this.webview.nativeElement.src = auth.twitter.getAuthURL();
    this._changeDetector.markForCheck();
  }

}

import { Component, OnInit, Inject, ChangeDetectorRef, ChangeDetectionStrategy, Injector } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { GenericLoginDialogOptions } from 'src/app/websites/components/generic-login-dialog/generic-login-dialog.component';
import { MAT_DIALOG_DATA } from '@angular/material';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { LoginStatus } from 'src/app/websites/interfaces/website-service.interface';
import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';

@Component({
  selector: 'inkbunny-login-dialog',
  templateUrl: './inkbunny-login-dialog.component.html',
  styleUrls: ['./inkbunny-login-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'login-dialog'
  }
})
export class InkbunnyLoginDialog implements OnInit {
  public hide: boolean = true;
  public loggedIn: boolean = false;
  public attempting: boolean = false;
  public showHint: boolean = false;

  public loginForm: FormGroup;

  private inkbunny: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: GenericLoginDialogOptions,
    fb: FormBuilder,
    injector: Injector,
    private _loginManager: LoginManagerService,
    private _changeDetector: ChangeDetectorRef
  ) {
    this.loginForm = fb.group({
      username: [null, Validators.required],
      password: [null, Validators.required]
    });

    this.inkbunny = injector.get(WebsiteRegistry.getConfigForRegistry('InkBunny').class); // avoid circ dep constructor issue
  }

  ngOnInit() {
    this.loggedIn = this._loginManager.getLoginStatus(this.data.persist, 'InkBunny') === LoginStatus.LOGGED_IN;
    this._changeDetector.markForCheck();
  }

  public login(): void {
    this.attempting = true;
    this.inkbunny.authorize(this.loginForm.value, this.data.persist)
      .then(loggedIn => {
        this.loggedIn = loggedIn;
        this.showHint = !loggedIn;
      }).finally(() => {
        this.attempting = false;
        this._changeDetector.markForCheck();
      });
  }

  public logout(): void {
    this.loggedIn = false;
    this.inkbunny.unauthorize(this.data.persist);
    this._changeDetector.markForCheck();
  }

}

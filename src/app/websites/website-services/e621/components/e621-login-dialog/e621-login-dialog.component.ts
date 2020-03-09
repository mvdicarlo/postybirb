import { Component, OnInit, Inject, ChangeDetectorRef, ChangeDetectionStrategy, Injector } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { GenericLoginDialogOptions } from 'src/app/websites/components/generic-login-dialog/generic-login-dialog.component';
import { MAT_DIALOG_DATA } from '@angular/material';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { LoginStatus } from 'src/app/websites/interfaces/website-service.interface';
import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';

@Component({
  selector: 'e621-login-dialog',
  templateUrl: './e621-login-dialog.component.html',
  styleUrls: ['./e621-login-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'login-dialog'
  }
})
export class E621LoginDialog implements OnInit {
  public hide: boolean = true;
  public loggedIn: boolean = false;
  public attempting: boolean = false;
  public showHint: boolean = false;

  public loginForm: FormGroup;

  private e621: any;

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

    this.e621 = injector.get(WebsiteRegistry.getConfigForRegistry('E621').class); // avoid circ dep constructor issue
  }

  ngOnInit() {
    this.loggedIn = this._loginManager.getLoginStatus(this.data.persist, 'E621') === LoginStatus.LOGGED_IN;
    this._changeDetector.markForCheck();
  }

  public login(): void {
    this.attempting = true;
    this.e621.authorize(this.loginForm.value, this.data.persist)
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
    this.e621.unauthorize(this.data.persist);
    this._changeDetector.markForCheck();
  }

  public openAPI(event: Event): void {
    event.preventDefault();
    openUrlInBrowser('https://e621.net/users/home');
  }
}

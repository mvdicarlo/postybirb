import { Component, OnInit, Inject, Injector, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { GenericLoginDialogOptions } from 'src/app/websites/components/generic-login-dialog/generic-login-dialog.component';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material';
import { LoginManagerService } from 'src/app/login/services/login-manager.service';
import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';
import { LoginStatus } from 'src/app/websites/interfaces/website-service.interface';

@Component({
  selector: 'furry-network-login-dialog',
  templateUrl: './furry-network-login-dialog.component.html',
  styleUrls: ['./furry-network-login-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'login-dialog'
  }
})
export class FurryNetworkLoginDialog implements OnInit {
  public hide: boolean = true;
  public loggedIn: boolean = false;
  public attempting: boolean = false;

  public loginForm: FormGroup;

  private furrynetwork: any;

  constructor(@Inject(MAT_DIALOG_DATA) public data: GenericLoginDialogOptions,
    fb: FormBuilder,
    injector: Injector,
    private _loginManager: LoginManagerService,
    private _changeDetector: ChangeDetectorRef
  ) {
    this.loginForm = fb.group({
      username: [null, Validators.required],
      password: [null, Validators.required]
    });

    this.furrynetwork = injector.get(WebsiteRegistry.getConfigForRegistry('FurryNetwork').class); // avoid circ dep constructor issue
  }

  ngOnInit() {
    this.loggedIn = this._loginManager.getLoginStatus(this.data.persist, 'FurryNetwork') === LoginStatus.LOGGED_IN;
    this._changeDetector.markForCheck();
  }

  public login(): void {
    this.attempting = true;
    this.furrynetwork.authorize(this.loginForm.value, this.data.persist)
      .then(loggedIn => {
        this.loggedIn = loggedIn;
      }).finally(() => {
        this.attempting = false;
        this._changeDetector.markForCheck();
      });
  }

  public logout(): void {
    this.loggedIn = false;
    this.furrynetwork.unauthorize(this.data.persist);
    this._changeDetector.markForCheck();
  }

}

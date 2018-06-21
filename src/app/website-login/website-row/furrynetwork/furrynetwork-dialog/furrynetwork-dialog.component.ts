import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { WebsiteManagerService } from '../../../../commons/services/website-manager/website-manager.service';
import { SupportedWebsites } from '../../../../commons/enums/supported-websites';

@Component({
  selector: 'furrynetwork-dialog',
  templateUrl: './furrynetwork-dialog.component.html',
  styleUrls: ['./furrynetwork-dialog.component.css']
})
export class FurrynetworkDialogComponent implements OnInit {
  loginForm: FormGroup;
  isLoggedIn: boolean;
  invalidLoginCredentials: boolean;

  constructor(private fb: FormBuilder, private service: WebsiteManagerService) {
    this.loginForm = fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    const info = store.get(SupportedWebsites.FurryNetwork.toLowerCase());
    if (info && info.name !== null && info.name !== undefined) {
      this.isLoggedIn = true;
    } else {
      this.isLoggedIn = false;
    }
  }

  public submitLogin() {
    if (this.loginForm.valid) this.service.authorizeWebsite(SupportedWebsites.FurryNetwork, this.loginForm.value).then(
      (success) => {
        this.isLoggedIn = true;
        this.invalidLoginCredentials = false;
      }, (failure) => {
        this.isLoggedIn = false;
        this.invalidLoginCredentials = true;
      }
    );
  }

  public submitLogout() {
    this.service.unauthorizeWebsite(SupportedWebsites.FurryNetwork);
    this.isLoggedIn = false;
  }

}

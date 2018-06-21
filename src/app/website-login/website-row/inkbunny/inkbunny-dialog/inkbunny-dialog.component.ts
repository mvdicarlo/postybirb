import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { WebsiteManagerService } from '../../../../commons/services/website-manager/website-manager.service';
import { SupportedWebsites } from '../../../../commons/enums/supported-websites';
import { MatCheckboxChange } from '@angular/material';

@Component({
  selector: 'inkbunny-dialog',
  templateUrl: './inkbunny-dialog.component.html',
  styleUrls: ['./inkbunny-dialog.component.css']
})
export class InkbunnyDialogComponent implements OnInit {
  loginForm: FormGroup;
  isLoggedIn: boolean;
  invalidLoginCredentials: boolean;

  @ViewChild('passwordInput') pw: ElementRef;

  constructor(private fb: FormBuilder, private service: WebsiteManagerService) {
    this.loginForm = fb.group({
      username: ['', [Validators.required]],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    const info = store.get(SupportedWebsites.Inkbunny.toLowerCase());
    if (info && info.name !== null && info.name !== undefined) {
      this.isLoggedIn = true;
    } else {
      this.isLoggedIn = false;
    }
  }

  public submitLogin() {
    if (this.loginForm.valid) this.service.authorizeWebsite(SupportedWebsites.Inkbunny, this.loginForm.value).then(
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
    this.service.unauthorizeWebsite(SupportedWebsites.Inkbunny);
    this.isLoggedIn = false;
  }

  public showPassword(event: MatCheckboxChange) {
    if (event.checked) {
      this.pw.nativeElement.type = 'text';
    } else {
      this.pw.nativeElement.type = 'password';
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { LoginProfileManagerService } from '../../services/login-profile-manager.service';
import { LoginProfile } from '../../interfaces/login-profile';

export function getDefaultProfile(profiles: LoginProfile[]): LoginProfile {
  if (profiles && profiles.length) {
    return profiles.find(p => p.defaultProfile) || profiles[0];
  }

  return null;
}

@Component({
  selector: 'login-profile-select-dialog',
  templateUrl: './login-profile-select-dialog.component.html',
  styleUrls: ['./login-profile-select-dialog.component.css']
})
export class LoginProfileSelectDialog implements OnInit {
  public profiles: LoginProfile[] = [];
  public selectControl: FormControl;

  constructor(private _loginProfileManager: LoginProfileManagerService) { }

  ngOnInit() {
    this.profiles = this._loginProfileManager.getAllProfiles();
    this.selectControl = new FormControl(getDefaultProfile(this.profiles), Validators.required);
  }

}

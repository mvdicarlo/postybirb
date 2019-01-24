import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { LoginProfileManagerService } from '../../services/login-profile-manager.service';
import { LoginProfile } from '../../interfaces/login-profile';

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
    this.selectControl = new FormControl(this.profiles ? this.profiles[0] : null, Validators.required);
  }

}

import { Pipe, PipeTransform } from '@angular/core';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';

@Pipe({
  name: 'profileName',
  pure: false
})
export class ProfileNamePipe implements PipeTransform {
  constructor(private _loginProfileManager: LoginProfileManagerService) {}

  transform(id: any): any {
    return id ? this._loginProfileManager.getProfileName(id) : 'Unknown Profile';
  }

}

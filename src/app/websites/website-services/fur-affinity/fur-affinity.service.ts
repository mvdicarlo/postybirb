import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { WebsiteService, WebsiteStatus, LoginStatus } from '../../interfaces/website-service.interface';

@Injectable({
  providedIn: 'root'
})
@Website({
  displayedName: 'Fur Affinity',
  login: {
    url: 'https://www.furaffinity.net/login'
  }
})
export class FurAffinity implements WebsiteService {

  constructor() { }

  public checkStatus(profileId: string): Promise<WebsiteStatus> {
    return new Promise((resolve, reject) => {
      resolve({
        username: 'Lemonynade',
        status: LoginStatus.LOGGED_IN
      });
    });
  }
}

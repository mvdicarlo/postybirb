import { Injectable } from '@angular/core';
import { Website } from '../decorators/website-decorator';
import { WebsiteService, WebsiteStatus, LoginStatus } from '../interfaces/website-service.interface';

@Injectable({
  providedIn: 'root'
})
@Website({})
export class Weasyl implements WebsiteService {

  constructor() { }

  public checkStatus(ids: string): Promise<WebsiteStatus> {
    return new Promise((resolve, reject) => {
      resolve({
        username: 'test',
        status: LoginStatus.LOGGED_IN
      })
    });
  }
}

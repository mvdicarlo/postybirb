import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { WebsiteService, WebsiteStatus, LoginStatus } from '../../interfaces/website-service.interface';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';

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
  readonly BASE_URL: string = 'https://www.furaffinity.net';

  constructor() { }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/controls/submissions`, this.BASE_URL, cookies);
    try {
      const body = response.body;
      if (body.includes('logout-link')) {
        const aTags = HTMLParser.getTagsOf(body, 'a');
        const matcher = /href="\/user\/.*"/g;

        // This code is a bit messy and is marked for refactor
        if (aTags.length > 0) {
          for (let i = 0; i < aTags.length; i++) {
            let tag = aTags[i];
            if (tag.match(matcher)) {
              returnValue.username = tag.match(matcher)[0].split('/')[2] || null
              returnValue.status = LoginStatus.LOGGED_IN;
              break;
            }
          }
        }
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }
}

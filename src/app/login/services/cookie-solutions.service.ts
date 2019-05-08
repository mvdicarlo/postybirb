/**
 * This exists due to the fact that electron will not save session cookies
 * Some websites such as Derpibooru use them to track visit state which is needed to post.
 */

import { Injectable } from '@angular/core';
import { LoginProfileManagerService } from './login-profile-manager.service';

@Injectable({
  providedIn: 'root'
})
export class CookieSolutionsService {
  private seenProfiles: any[] = [];

  // DEPRECATED FOR NOW
  constructor(private _loginProfileManager: LoginProfileManagerService) {
    // _loginProfileManager.profileChanges.subscribe(profiles => {
    //   profiles.forEach(profile => {
    //     if (!this.seenProfiles.includes(profile.id)) {
    //       const cookies = getCookieAPI(profile.id);
    //       cookies.on('changed', (event, cookie, cause, removed) => {
    //         Derpibooru fix
    //         if (cookie.domain.includes('derpibooru')) {
    //           if (cookie.name == '_booru_fpr' && cookie.session && !removed) {
    //             const c = {
    //               url: 'https://derpibooru.org',
    //               name: cookie.name,
    //               hostOnly: true,
    //               httpOnly: false,
    //               domain: cookie.domain,
    //               secure: false,
    //               session: false,
    //               expirationDate: 999999999999999,
    //               path: cookie.path,
    //               value: cookie.value
    //             }
    //
    //             cookies.set(c, (err) => {
    //               if (err) {
    //                 console.log(err)
    //               }
    //             });
    //           }
    //         }
    //       });
    //
    //       this.seenProfiles.push(profile.id);
    //     }
    //   });
    // });
  }
}

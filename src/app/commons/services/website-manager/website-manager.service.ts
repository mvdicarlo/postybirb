import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subscriber } from 'rxjs';
import { Website } from '../../interfaces/website.interface';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { BbCodeParse } from '../../../commons/helpers/bbcode-parse';
import { PostyBirbSubmissionModel } from '../../../postybirb/models/postybirb-submission-model';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { NotifyService } from '../notify/notify.service';

import { Aryion } from '../../models/website/aryion';
import { Derpibooru } from '../../models/website/derpibooru';
import { DeviantArt } from '../../models/website/deviantart';
import { E621 } from '../../models/website/e621';
import { Furaffinity } from '../../models/website/furaffinity';
import { Furiffic } from '../../models/website/furiffic';
import { FurryNetwork } from '../../models/website/furrynetwork';
import { HentaiFoundry } from '../../models/website/hentaifoundry';
import { Inkbunny } from '../../models/website/inkbunny';
import { Mastodon } from '../../models/website/mastodon';
import { Pixiv } from '../../models/website/pixiv';
import { PaigeeWorld } from '../../models/website/paigee-world';
import { Patreon } from '../../models/website/patreon';
import { Route50 } from '../../models/website/route50';
import { SoFurry } from '../../models/website/sofurry';
import { Tumblr } from '../../models/website/tumblr';
import { Twitter } from '../../models/website/twitter';
import { Weasyl } from '../../models/website/weasyl';

/**
 * @description
 * Service that acts as an interface to all the website services
 */
@Injectable()
export class WebsiteManagerService {
  private websites: Map<string, Website>;
  private statusSubject: BehaviorSubject<any>;
  private refreshMap: Map<string, Website>;

  private bbcodeParser: BbCodeParse;

  constructor(derpibooru: Derpibooru, deviantArt: DeviantArt, e621: E621, furaffinity: Furaffinity, furiffic: Furiffic,
    furryNetwork: FurryNetwork, hentaiFoundry: HentaiFoundry, inkbunny: Inkbunny, mastodon: Mastodon, pixiv: Pixiv, paigeeWorld: PaigeeWorld,
    patreon: Patreon, route50: Route50, soFurry: SoFurry, tumblr: Tumblr, twitter: Twitter, weasyl: Weasyl, aryion: Aryion, private notify: NotifyService) {
    this.statusSubject = new BehaviorSubject<any>({});
    this.refreshMap = new Map<string, Website>();
    this.bbcodeParser = new BbCodeParse();

    this.websites = new Map<string, Website>();
    this.websites.set(SupportedWebsites.Aryion, aryion);
    this.websites.set(SupportedWebsites.Derpibooru, derpibooru);
    this.websites.set(SupportedWebsites.e621, e621);
    this.websites.set(SupportedWebsites.Furaffinity, furaffinity);
    this.websites.set(SupportedWebsites.Furiffic, furiffic);
    if (sfw !== 'true') this.websites.set(SupportedWebsites.HentaiFoundry, hentaiFoundry);
    this.websites.set(SupportedWebsites.PaigeeWorld, paigeeWorld);
    this.websites.set(SupportedWebsites.Patreon, patreon);
    this.websites.set(SupportedWebsites.Pixiv, pixiv);
    this.websites.set(SupportedWebsites.Route50, route50);
    this.websites.set(SupportedWebsites.SoFurry, soFurry);
    this.websites.set(SupportedWebsites.Weasyl, weasyl);

    this.websites.set(SupportedWebsites.FurryNetwork, furryNetwork);
    this.refreshMap.set(SupportedWebsites.FurryNetwork, furryNetwork);

    this.websites.set(SupportedWebsites.DeviantArt, deviantArt);
    this.refreshMap.set(SupportedWebsites.DeviantArt, deviantArt);

    if (sfw !== 'true') {
      this.websites.set(SupportedWebsites.Inkbunny, inkbunny);
      this.refreshMap.set(SupportedWebsites.Inkbunny, inkbunny);
    }

    this.websites.set(SupportedWebsites.Mastodon, mastodon);
    this.refreshMap.set(SupportedWebsites.Mastodon, mastodon);

    this.websites.set(SupportedWebsites.Tumblr, tumblr);
    this.refreshMap.set(SupportedWebsites.Tumblr, tumblr);

    this.websites.set(SupportedWebsites.Twitter, twitter);
    this.refreshMap.set(SupportedWebsites.Twitter, twitter);

    this.refreshAuthorizedWebsites();
    this.refreshAllStatuses();

    setInterval(this.refreshAllStatuses.bind(this), 10 * 60000);
    setInterval(this.refreshAuthorizedWebsite.bind(this), 4 * 60000, [deviantArt]);
    setInterval(this.refreshAuthorizedWebsite.bind(this), 30 * 60000, [furryNetwork]);
    setInterval(this.refreshAuthorizedWebsite.bind(this), 120 * 60000, [tumblr, twitter]);
  }

  private refreshAuthorizedWebsites(): void {
    this.refreshMap.forEach((website, key) => {
      website.refresh().then(() => {
        this.checkLogin(key);
      }, () => {
        this.checkLogin(key);
      });
    });
  }

  private refreshAuthorizedWebsite(websites: Website[] = []): void {
    for (let i = 0; i < websites.length; i++) {
      const website = websites[i];
      website.refresh().then(() => {
        this.checkLogin(website.websiteName);
      }, () => {
        this.checkLogin(website.websiteName);
      });
    }
  }

  public refreshAllStatuses(): void {
    this.websites.forEach((value, key) => {
      this.checkLogin(key);
    });
  }

  public checkLogin(website: string): void {
    if (!this.websites.get(website)) return;
    this.websites.get(website).getStatus().then(result => {
      this.statusSubject.next(this.getWebsiteStatuses());
    }).catch(result => {
      this.statusSubject.next(this.getWebsiteStatuses());
    });
  }

  public authorizeWebsite(website: string, authInfo: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.websites.get(website).authorize(authInfo).then((success) => resolve(success), () => reject(false));
    });
  }

  public unauthorizeWebsite(website: string): void {
    this.websites.get(website).unauthorize();
    this.checkLogin(website);
  }

  /**
   * @function getObserver
   * @description provides an observer that outputs when website statuses are updated
   */
  public getObserver(): Observable<any> {
    return this.statusSubject.asObservable();
  }

  public getUsername(website: string): Promise<string> {
    return this.websites.get(website).getUser();
  }

  public getInfo(website: string): any {
    return this.websites.get(website).getInfo();
  }

  public getWebsiteStatuses(): any[] {
    const results: any = {};
    this.websites.forEach((websiteObj, website) => {
      results[website] = websiteObj.getLoginStatus();
    });

    return results;
  }

  public post(website: string, submission: PostyBirbSubmissionModel): Observable<any> {
    const data: PostyBirbSubmissionData = submission.getAllForWebsite(website);
    data.description = this.bbcodeParser.parse(data.description, website, !data.parseDescription).parsed;

    const site = this.websites.get(website);
    return new Observable(observer => {
      if (site.getLoginStatus() === WebsiteStatus.Logged_In) {
        site.checkAuthorized().then(() => {
          site.post(data).subscribe((success) => {
            observer.next(success);
            observer.complete();
          }, (err) => {
            observer.error(err);
            observer.complete();
          });
        }).catch(() => {
          this.notLoggedIn(observer, website);
        });
      } else {
        this.notLoggedIn(observer, website);
      }
    });
  }

  public postJournal(website: string, data: any): Observable<any> {
    const site = this.websites.get(website);
    return new Observable(observer => {
      if (site.getLoginStatus() === WebsiteStatus.Logged_In) {
        site.checkAuthorized().then(() => {
          site.postJournal(this.buildJournalPost(website, data)).subscribe((success) => {
            observer.next(success);
            observer.complete();
          }, (err) => {
            observer.error(err);
            observer.complete();
          });
        }).catch(() => {
          this.notLoggedIn(observer, website);
        });
      } else {
        this.notLoggedIn(observer, website);
      }
    });
  }

  private buildJournalPost(website: string, data: any): any {
    const options = data.options[website];

    const obj: any = {
      tags: data.tags,
      title: data.title,
      rating: data.rating,
      options: options.options //weird nesting here
    };

    const defaultDescription = data.description ? data.description.description : '';
    const customDescription = options.description;

    let description = defaultDescription;
    let parseDescription = data.description ? !data.description.simple : true;
    if (customDescription && !customDescription.useDefault) { // Determine whether to use custom or default description
      description = customDescription.description;
      parseDescription = customDescription && !customDescription.useDefault ? !customDescription.simple : true;
    }

    obj.description = this.bbcodeParser.parse(description, website, !parseDescription).parsed;
    return obj;
  }

  private notLoggedIn(observer: Subscriber<any>, website: string): void {
    observer.error({ msg: `Not logged into: ${website}`, skipLog: true });
    observer.complete();

    this.notify.translateNotification('Not logged in').subscribe((msg) => {
      this.notify.getNotify().error(`${msg} - ${website}`);
    });
  }

}

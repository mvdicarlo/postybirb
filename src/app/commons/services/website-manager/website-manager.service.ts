import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Website } from '../../interfaces/website.interface';
import { SupportedWebsites } from '../../enums/supported-websites';
import { WebsiteStatus } from '../../enums/website-status.enum';
import { BbCodeParse } from '../../../commons/helpers/bbcode-parse';
import { PostyBirbSubmission } from '../../models/posty-birb/posty-birb-submission';
import { PostyBirbSubmissionData } from '../../interfaces/posty-birb-submission-data.interface';
import { NotifyService } from '../notify/notify.service';

import { Derpibooru } from '../../models/website/derpibooru';
import { DeviantArt } from '../../models/website/deviantart';
import { E621 } from '../../models/website/e621';
import { Furaffinity } from '../../models/website/furaffinity';
import { Furiffic } from '../../models/website/furiffic';
import { FurryNetwork } from '../../models/website/furrynetwork';
import { HentaiFoundry } from '../../models/website/hentaifoundry';
import { Inkbunny } from '../../models/website/inkbunny';
import { Pixiv } from '../../models/website/pixiv';
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
  private statusSubject: Subject<any>;
  private refreshMap: Map<string, Website>;

  private bbcodeParser: BbCodeParse;

  constructor(private derpibooru: Derpibooru, private deviantArt: DeviantArt, private e621: E621, private furaffinity: Furaffinity, private furiffic: Furiffic,
    private furryNetwork: FurryNetwork, private hentaiFoundry: HentaiFoundry, private inkbunny: Inkbunny, private pixiv: Pixiv, private patreon: Patreon, private route50: Route50,
    private soFurry: SoFurry, private tumblr: Tumblr, private twitter: Twitter, private weasyl: Weasyl, private notify: NotifyService) {
    this.statusSubject = new Subject<any>();
    this.refreshMap = new Map<string, Website>();
    this.statusSubject = new Subject<WebsiteStatus>();
    this.bbcodeParser = new BbCodeParse();

    this.websites = new Map<string, Website>();
    this.websites.set(SupportedWebsites.Derpibooru, derpibooru);
    this.websites.set(SupportedWebsites.e621, e621);
    this.websites.set(SupportedWebsites.Furaffinity, furaffinity);
    this.websites.set(SupportedWebsites.Furiffic, furiffic);
    if (window['sfw'] !== 'true') this.websites.set(SupportedWebsites.HentaiFoundry, hentaiFoundry);
    this.websites.set(SupportedWebsites.Patreon, patreon);
    this.websites.set(SupportedWebsites.Pixiv, pixiv);
    this.websites.set(SupportedWebsites.Route50, route50);
    this.websites.set(SupportedWebsites.SoFurry, soFurry);
    this.websites.set(SupportedWebsites.Weasyl, weasyl);

    this.websites.set(SupportedWebsites.FurryNetwork, furryNetwork);
    this.refreshMap.set(SupportedWebsites.FurryNetwork, furryNetwork);

    this.websites.set(SupportedWebsites.DeviantArt, deviantArt);
    this.refreshMap.set(SupportedWebsites.DeviantArt, deviantArt);

    if (window['sfw'] !== 'true') {
      this.websites.set(SupportedWebsites.Inkbunny, inkbunny);
      this.refreshMap.set(SupportedWebsites.Inkbunny, inkbunny);
    }

    this.websites.set(SupportedWebsites.Tumblr, tumblr);
    this.refreshMap.set(SupportedWebsites.Tumblr, tumblr);

    this.websites.set(SupportedWebsites.Twitter, twitter);
    this.refreshMap.set(SupportedWebsites.Twitter, twitter);

    this.refreshAuthorizedWebsites();
    this.refreshAllStatuses();

    setInterval(this.refreshAuthorizedWebsites.bind(this), 4 * 60000);
    setInterval(this.refreshAllStatuses.bind(this), 10 * 60000)
  }

  private refreshAuthorizedWebsites(): void {
    store.removeExpiredKeys();
    this.refreshMap.forEach((website, key) => {
      website.refresh().then((success) => {
        this.checkLogin(key);
      }, (err) => {
        this.checkLogin(key);
      });
    });
  }

  public refreshAllStatuses(): void {
    store.removeExpiredKeys();
    this.websites.forEach((value, key, map) => {
      this.checkLogin(key);
    });
  }

  public checkLogin(website: string): void {
    if (!this.websites.get(website)) return;
    this.websites.get(website).getStatus().then(result => {
      this.statusSubject.next({ [website]: result });
    }).catch(result => {
      this.statusSubject.next({ [website]: result });
    });
  }

  public authorizeWebsite(website: string, authInfo: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.websites.get(website).authorize(authInfo).then((success) => resolve(success), (err) => reject(false));
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

  public getOther(website: string): any {
    return this.websites.get(website).getOtherInfo();
  }

  public getWebsiteStatuses(): any[] {
    const results: any = {};
    this.websites.forEach((websiteObj, website, map) => {
      results[website] = websiteObj.getLoginStatus();
    });

    return results;
  }

  public post(website: string, submission: PostyBirbSubmission): Observable<any> {
    const data: PostyBirbSubmissionData = submission.getAllForWebsite(website);
    data.description = this.bbcodeParser.parse(data.description, website, !data.parseDescription).parsed;

    const site = this.websites.get(website);
    return new Observable(observer => {
      site.getUser().then(() => {
        site.checkAuthorized().then(() => {
          site.post(data).subscribe((success) => {
            observer.next(success);
            observer.complete();
          }, (err) => {
            observer.error(err);
            observer.complete();
          });
        }).catch(() => {
          observer.error({ msg: `Not logged into: ${website}`, skipLog: true });
          observer.complete();

          this.notify.translateNotification('Not logged in').subscribe((msg) => {
            this.notify.getNotify().error(`${msg} - ${website}`);
          });
        });
      }).catch(() => {
        observer.error({ msg: `Not logged into: ${website}`, skipLog: true });
        observer.complete();

        this.notify.translateNotification('Not logged in').subscribe((msg) => {
          this.notify.getNotify().error(`${msg} - ${website}`);
        });
      });
    });
  }

  public postJournal(website: string, title: string, description: string, options: any): Observable<any> {
    let parsedDescription = this.bbcodeParser.parse(description, website).parsed;
    const websiteOptions = Object.assign({}, options[website]);
    websiteOptions.rating = options.rating;
    websiteOptions.tags = options.tags;

    const site = this.websites.get(website);
    return new Observable(observer => {
      site.getUser().then(() => {
        site.checkAuthorized().then(() => {
          site.postJournal(title, parsedDescription, websiteOptions).subscribe((success) => {
            observer.next(success);
            observer.complete();
          }, (err) => {
            observer.error(err);
            observer.complete();
          });
        }).catch(() => {
          observer.error({ msg: `Not logged into: ${website}`, skipLog: true });
          observer.complete();

          this.notify.translateNotification('Not logged in').subscribe((msg) => {
            this.notify.getNotify().error(`${msg} - ${website}`);
          });
        });
      }).catch(() => {
        observer.error({ msg: `Not logged into: ${website}`, skipLog: true });
        observer.complete();

        this.notify.translateNotification('Not logged in').subscribe((msg) => {
          this.notify.getNotify().error(`${msg} - ${website}`);
        });
      });
    });
  }

}

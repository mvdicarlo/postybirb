import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
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
import { FurryAmino } from '../../models/website/furry-amino';
import { FurryNetwork } from '../../models/website/furrynetwork';
import { HentaiFoundry } from '../../models/website/hentaifoundry';
import { Inkbunny } from '../../models/website/inkbunny';
import { Newgrounds } from '../../models/website/newgrounds';
import { Mastodon } from '../../models/website/mastodon';
import { Pixiv } from '../../models/website/pixiv';
import { PaigeeWorld } from '../../models/website/paigee-world';
import { Patreon } from '../../models/website/patreon';
import { Route50 } from '../../models/website/route50';
import { SoFurry } from '../../models/website/sofurry';
import { Tumblr } from '../../models/website/tumblr';
import { Twitter } from '../../models/website/twitter';
import { Weasyl } from '../../models/website/weasyl';
import { PostReport } from '../../models/website/base-website';

/**
 * @description
 * Service that acts as an interface to all the website services
 */
@Injectable()
export class WebsiteManagerService {
  private websites: Map<string, Website>;

  private bbcodeParser: BbCodeParse;

  private hasAlreadySeenAndMayBeAttemptingList: string[] = [];

  constructor(derpibooru: Derpibooru, deviantArt: DeviantArt, e621: E621, furaffinity: Furaffinity, furiffic: Furiffic,
    furryNetwork: FurryNetwork, hentaiFoundry: HentaiFoundry, inkbunny: Inkbunny, mastodon: Mastodon, pixiv: Pixiv, paigeeWorld: PaigeeWorld,
    patreon: Patreon, route50: Route50, soFurry: SoFurry, tumblr: Tumblr, twitter: Twitter, weasyl: Weasyl, aryion: Aryion, furryAmino: FurryAmino,
    newgrounds: Newgrounds,
    private notify: NotifyService) {
    this.bbcodeParser = new BbCodeParse();

    this.websites = new Map<string, Website>();
    this.websites.set(SupportedWebsites.Aryion, aryion);
    this.websites.set(SupportedWebsites.Derpibooru, derpibooru);
    this.websites.set(SupportedWebsites.e621, e621);
    this.websites.set(SupportedWebsites.Furaffinity, furaffinity);
    this.websites.set(SupportedWebsites.Furiffic, furiffic);
    this.websites.set(SupportedWebsites.Newgrounds, newgrounds);
    if (sfw !== 'true') this.websites.set(SupportedWebsites.HentaiFoundry, hentaiFoundry);
    this.websites.set(SupportedWebsites.PaigeeWorld, paigeeWorld);
    this.websites.set(SupportedWebsites.Patreon, patreon);
    this.websites.set(SupportedWebsites.Pixiv, pixiv);
    this.websites.set(SupportedWebsites.Route50, route50);
    this.websites.set(SupportedWebsites.SoFurry, soFurry);
    this.websites.set(SupportedWebsites.Weasyl, weasyl);
    this.websites.set(SupportedWebsites.FurryNetwork, furryNetwork);
    this.websites.set(SupportedWebsites.DeviantArt, deviantArt);
    if (sfw !== 'true') {
      this.websites.set(SupportedWebsites.Inkbunny, inkbunny);
    }
    this.websites.set(SupportedWebsites.Mastodon, mastodon);
    this.websites.set(SupportedWebsites.Tumblr, tumblr);
    this.websites.set(SupportedWebsites.Twitter, twitter);
    this.websites.set(SupportedWebsites.FurryAmino, furryAmino);
  }

  public getWebsiteStatuses(): any[] {
    const results: any = {};
    this.websites.forEach((websiteObj, website) => {
      results[website] = websiteObj.getLoginStatus();
    });

    return results;
  }

  public post(website: string, submission: PostyBirbSubmissionModel): Observable<PostReport> {
    const data: PostyBirbSubmissionData = submission.getAllForWebsite(website);
    data.description = this.bbcodeParser.parse(data.description, website, !data.parseDescription).parsed;

    const site = this.websites.get(website);
    return new Observable(observer => {
      const attempt: string = `${submission.getId()}-${website}`;
      if (this.hasAlreadySeenAndMayBeAttemptingList.includes(attempt)) {
        observer.error({
          err: 'PostyBirb somehow tried to double post to the same website',
          website,
          submission: data,
          notify: 'PostyBirb somehow tried to double post to the same website',
          msg: 'PostyBirb somehow tried to double post to the same website'
        });
        observer.complete();
        return;
      } else {
        this.hasAlreadySeenAndMayBeAttemptingList.push(attempt);
      }

      const attemptIndex: number = this.hasAlreadySeenAndMayBeAttemptingList.indexOf(attempt);

      if (site.getLoginStatus() === WebsiteStatus.Logged_In) {
        site.checkAuthorized().then(() => {
          if (fakePosts) { // I really should do this with karma and do real testing (if I ever learn to do that well)
            const rand = Math.floor(Math.random() * 100);
            if (rand >= 10) {
              observer.next({ err: null, website, submission: data, notify: 'Completed on random', msg: 'Completed on random '});
              observer.complete();
            } else {
              this.hasAlreadySeenAndMayBeAttemptingList.splice(attemptIndex, 1);
              observer.error({ err: null, website, submission: data, notify: 'Failed on random', msg: 'Failed on random '});
              observer.complete();
            }
          } else {
            site.post(data).subscribe((success) => {
              observer.next(success);
              observer.complete();
            }, (err) => {
              this.hasAlreadySeenAndMayBeAttemptingList.splice(attemptIndex, 1);
              observer.error(err);
              observer.complete();
            });
          }
        }).catch(() => {
          this.hasAlreadySeenAndMayBeAttemptingList.splice(attemptIndex, 1);
          this.notLoggedIn(observer, website);
        });
      } else {
        this.hasAlreadySeenAndMayBeAttemptingList.splice(attemptIndex, 1);
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

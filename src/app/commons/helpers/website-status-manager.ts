import { WebsiteStatus } from '../enums/website-status.enum';

export class WebsiteStatusManager {
  private offline: string[] = [];
  private online: string[] = [];

  constructor(public allowedWebsites: string[] = []) { }

  public update(statuses: any): void {
    let onlineInserted: boolean = false;
    let offlineInserted: boolean = false;

    const keys = Object.keys(statuses).filter(s => this.allowedWebsites.includes(s));
    for (let i = 0; i < keys.length; i++) {
      const website = keys[i];
      if (statuses[website] === WebsiteStatus.Logged_In) { // Add to Online, remove from Offline
        const index = this.online.indexOf(website);
        if (index !== -1) {
          this.offline.splice(index, 1);
        }

        if (!this.online.includes(website)) {
          this.online.push(website);
          onlineInserted = true;
        }
      } else { // Remove from Online, add to Offline
        const index = this.online.indexOf(website);
        if (index !== -1) {
          this.online.splice(index, 1);
        }

        if (!this.offline.includes(website)) {
          this.offline.push(website);
          offlineInserted = true;
        }
      }

    }

    if (onlineInserted) this.online.sort();
    if (offlineInserted) {
      this.offline.sort();
    }
  }

  public getOffline(): string[] {
    return this.offline;
  }

  public getOnline(): string[] {
    return this.online;
  }


}

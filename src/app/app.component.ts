import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UpdateService } from './commons/services/update/update.service';
import { PostManagerService } from './posty-birb/services/post-manager/post-manager.service';
import { SchedulerService } from './posty-birb/services/scheduler/scheduler.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public version: string;
  public showSidebar: boolean = false;
  private knownLanguages: any = ['de', 'en', 'es', 'fi', 'fr', 'pt'];

  constructor(private translate: TranslateService, update: UpdateService, postManager: PostManagerService, scheduler: SchedulerService) {
    this.version = appVersion;

    let userLanguage = window.navigator.language.split('-')[0];
    if (this.knownLanguages.indexOf(userLanguage) === -1) {
      userLanguage = 'en';
    }

    translate.setDefaultLang('en');
    translate.use(userLanguage);

    this.loadOlderStore();
  }

  public switchLanguage(language: string): void {
    this.translate.use(language);
  }

  public toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  public openURL(url: string): void {
    openUrlInBrowser(url);
  }

  // Load old configs into new config file and clear
  private loadOlderStore(): void {
    const globalAdvertise = store.get('globalAdvertise');
    if (globalAdvertise !== undefined) db.set('globalAdvertise', globalAdvertise).write();

    const postInterval = store.get('postInterval');
    if (postInterval !== undefined) db.set('postInterval', postInterval).write();

    const stopOnFailure = store.get('stopOnFailure');
    if (stopOnFailure !== undefined) db.set('stopOnFailure', stopOnFailure).write();

    const generateLogOnFailure = store.get('generateLogOnFailure');
    if (generateLogOnFailure !== undefined) db.set('generateLogOnFailure', generateLogOnFailure).write();

    const templates = store.get('posty-birb-templates');
    if (templates !== undefined) db.set('posty-birb-templates', templates).write();

    store.clearAll(); // No longer using local storage
  }

}

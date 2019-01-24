import { WebsiteRegistry } from '../registries/website.registry';
import { GenericLoginDialog } from '../components/generic-login-dialog/generic-login-dialog.component';

export interface WebsiteConfig {
  refreshInterval?: number;     // interval at which the app will check status [default=30 minutes]
  displayedName?: string        // name value that is displayed in the UI to the user [default=constructor name]
  login: { // login dialog information
    dialog?: any; // dialog component
    url: string;
  }
}

export function Website(websiteConfig: WebsiteConfig) {
  if (!websiteConfig.refreshInterval) websiteConfig.refreshInterval = 30 * 60000;
  if (!websiteConfig.login.dialog) websiteConfig.login.dialog = GenericLoginDialog;

  return (target: Function) => {
    if (!websiteConfig.displayedName) websiteConfig.displayedName = target.name;
    WebsiteRegistry.set(target, websiteConfig);
  }
}

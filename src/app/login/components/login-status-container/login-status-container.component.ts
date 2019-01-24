import { Component} from '@angular/core';
import { WebsiteRegistry, WebsiteRegistryEntry } from 'src/app/websites/registries/website.registry';

@Component({
  selector: 'login-status-container',
  templateUrl: './login-status-container.component.html',
  styleUrls: ['./login-status-container.component.css']
})
export class LoginStatusContainerComponent {
  public registeredWebsites: WebsiteRegistryEntry = {};

  constructor() {
    this.registeredWebsites = WebsiteRegistry.getRegistered();
  }

}

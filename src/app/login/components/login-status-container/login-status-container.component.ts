import { Component } from '@angular/core';
import { WebsiteRegistryEntry } from 'src/app/websites/registries/website.registry';
import { MatDialog } from '@angular/material';
import { WebsiteFilterDialog } from '../website-filter-dialog/website-filter-dialog.component';
import { getUnfilteredWebsites } from '../../helpers/displayable-websites.helper';

@Component({
  selector: 'login-status-container',
  templateUrl: './login-status-container.component.html',
  styleUrls: ['./login-status-container.component.css']
})
export class LoginStatusContainerComponent {
  public registeredWebsites: WebsiteRegistryEntry = {};

  constructor(private dialog: MatDialog) {
    this._getDisplayableWebsites();
  }

  public openFilterDialog(): void {
    this.dialog.open(WebsiteFilterDialog)
      .afterClosed()
      .subscribe(() => {
        this._getDisplayableWebsites();
      });
  }

  private _getDisplayableWebsites(): void {
    this.registeredWebsites = getUnfilteredWebsites();
  }

}

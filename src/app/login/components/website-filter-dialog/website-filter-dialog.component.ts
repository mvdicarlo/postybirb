import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { WebsiteRegistryEntry, WebsiteRegistry } from 'src/app/websites/registries/website.registry';
import { setUnfilteredWebsites, getUnfilteredWebsites } from '../../helpers/displayable-websites.helper';

@Component({
  selector: 'website-filter-dialog',
  templateUrl: './website-filter-dialog.component.html',
  styleUrls: ['./website-filter-dialog.component.css']
})
export class WebsiteFilterDialog implements OnInit {
  public selectControl: FormControl = new FormControl(null, { updateOn: 'blur' });
  public registeredWebsites: WebsiteRegistryEntry = {};

  constructor() {
    this.registeredWebsites = WebsiteRegistry.getRegistered();
  }

  ngOnInit() {
    const unfiltered: WebsiteRegistryEntry = getUnfilteredWebsites();
    this.selectControl.setValue(Object.keys(unfiltered).map(key => key), { emitEvent: false });

    this.selectControl.valueChanges.subscribe(unfiltered => {
      setUnfilteredWebsites(Object.keys(this.registeredWebsites).filter(key => !unfiltered.includes(key)));
    });
  }

}

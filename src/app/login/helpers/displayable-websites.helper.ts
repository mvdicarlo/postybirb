import { WebsiteRegistryEntry, WebsiteRegistry } from 'src/app/websites/registries/website.registry';

const FILTERED_WEBSITE_STORE: string = 'FILTERED_WEBSITE_STORE';

export function getUnfilteredWebsites(): WebsiteRegistryEntry {
  const filtered = store.get(FILTERED_WEBSITE_STORE) || [];
  const registered = WebsiteRegistry.getRegistered();

  if (!filtered.length) {
    return registered;
  } else {
    const allowed: WebsiteRegistryEntry = {};

    Object.keys(registered).forEach(key => {
      if (!filtered.includes(key)) {
        allowed[key] = registered[key];
      }
    });

    return allowed;
  }
}

export function getFilteredWebsites(): WebsiteRegistryEntry {
  const filtered = store.get(FILTERED_WEBSITE_STORE) || [];
  const registered = WebsiteRegistry.getRegistered();

  if (!filtered.length) {
    return registered;
  } else {
    const isFiltered: WebsiteRegistryEntry = {};

    Object.keys(registered).forEach(key => {
      if (filtered.includes(key)) {
        isFiltered[key] = registered[key];
      }
    });

    return isFiltered;
  }
}

export function setUnfilteredWebsites(filteredWebsites: string[]): void {
  store.set(FILTERED_WEBSITE_STORE, filteredWebsites || []);
}

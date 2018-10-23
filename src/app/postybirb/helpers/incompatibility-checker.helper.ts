import { SupportedWebsiteRestrictions } from '../models/supported-websites-restrictions';

export function checkForWebsiteAndFileIncompatibility(file: File, rating: string, type: string, websites: string[]) {
  return websites ? SupportedWebsiteRestrictions.verifyWebsiteRestrictionsAndIncompatibilities(file, rating, type, websites) : {};
}

import { SupportedWebsiteRestrictions } from '../models/supported-websites-restrictions';
import { FileObject } from '../../commons/interfaces/file-obect.interface';

export function checkForWebsiteAndFileIncompatibility(file: File|FileObject, rating: string, type: string, websites: string[]) {
  return websites ? SupportedWebsiteRestrictions.verifyWebsiteRestrictionsAndIncompatibilities(file, rating, type, websites) : {};
}

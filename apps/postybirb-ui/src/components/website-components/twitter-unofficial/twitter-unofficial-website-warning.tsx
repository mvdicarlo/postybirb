import { Trans } from '@lingui/react/macro';
import { websiteWarningByName } from '../../sections/accounts-section/accounts-content';

websiteWarningByName.set('twitter-unofficial', () => (
  <Trans>
    Using this twitter implementation may lead to your account suspension or ban
    because twitter does not allow external tools to access its unofficial api.
    Developers of PostyBirb are not responsible for any harm done to or by your
    account. Use at your own risk.
  </Trans>
));

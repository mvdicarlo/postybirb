import { AccountLoginFlyout } from '../../components/account/account-login-flyout/account-login-flyout';
import { TagConvertersFlyout } from '../../components/tag-converters/tag-converters-flyout/tag-converters-flyout';
import { TagGroupsFlyout } from '../../components/tag-groups/tag-groups-flyout/tag-groups-flyout';
import AppSettings from '../app-settings';

export default function AppFlyouts() {
  return (
    <>
      <AppSettings key="app-settings-flyout" />
      <AccountLoginFlyout key="account-flyout" />
      <TagGroupsFlyout key="tag-group-flyout" />
      <TagConvertersFlyout key="tag-converter-flyout" />
    </>
  );
}

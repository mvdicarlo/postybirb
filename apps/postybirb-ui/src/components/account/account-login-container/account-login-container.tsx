import { EuiSpacer } from '@elastic/eui';
import { IWebsiteInfoDto, SettingsDto } from '@postybirb/types';
import settingsApi from '../../../api/settings.api';
import { ArrayHelper } from '../../../helpers/array.helper';
import { useAccountFilters } from '../../../hooks/account/use-accounts-filters';
import { filterWebsites } from '../../../hooks/account/use-websites';
import { DisplayableWebsiteLoginInfo } from '../../../models/displayable-website-login-info';
import AccountLoginCard from '../account-login-card/account-login-card';
import { AccountLoginFilters } from './account-login-filters';

type AccountLoginContainerProps = {
  availableWebsites: IWebsiteInfoDto[];
  settings: SettingsDto;
};

export function AccountLoginContainer(
  props: AccountLoginContainerProps
): JSX.Element {
  const { availableWebsites, settings: settingsDto } = props;
  const { settings } = settingsDto;
  const { filterState, setFilterState } = useAccountFilters();

  const websites = filterWebsites(
    availableWebsites,
    settings.hiddenWebsites,
    filterState
  );

  const allAccountGroups = ArrayHelper.unique(
    availableWebsites.flatMap(({ accounts }) =>
      accounts.flatMap(({ groups }) => groups)
    )
  );

  const onHideWebsite = (websiteInfo: DisplayableWebsiteLoginInfo) => {
    let hiddenWebsites = [...settings.hiddenWebsites];
    if (settings.hiddenWebsites.includes(websiteInfo.id)) {
      // Show
      hiddenWebsites = [...settings.hiddenWebsites].filter(
        (w) => w !== websiteInfo.id
      );
    } else {
      // Hide
      hiddenWebsites.push(websiteInfo.id);
    }

    // eslint-disable-next-line react/destructuring-assignment
    const updatedSettings = { ...props.settings };
    updatedSettings.settings = {
      ...updatedSettings.settings,
      hiddenWebsites,
    };

    settingsApi.update(updatedSettings.id, updatedSettings);
  };

  return (
    <div className="account-login-container">
      <AccountLoginFilters
        filterState={filterState}
        settings={settings}
        availableWebsites={availableWebsites}
        onFilterUpdate={setFilterState}
        onHide={onHideWebsite}
      />
      <EuiSpacer />
      <div className="account-login-list">
        {websites.map((website) => (
          <AccountLoginCard
            key={website.id}
            website={website}
            groups={allAccountGroups}
            instances={website.accounts
              .filter((account) => account.website === website.id)
              .sort((a, b) => a.name.localeCompare(b.name))}
            onHide={onHideWebsite}
          />
        ))}
      </div>
    </div>
  );
}

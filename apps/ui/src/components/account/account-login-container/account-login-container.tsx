import { EuiFilterButton, EuiFilterGroup, EuiSpacer } from '@elastic/eui';
import { IWebsiteLoginInfo } from '@postybirb/dto';
import { FormattedMessage } from 'react-intl';
import { useLocalStorage } from 'react-use';
import { AccountStore } from '../../../stores/account.store';
import useStore from '../../../stores/use-store';

type AccountLoginContainerProps = {
  availableWebsites: IWebsiteLoginInfo[];
};

function filterWebsites(
  availableWebsites: IWebsiteLoginInfo[],
  filters: { showHidden: boolean }
): IWebsiteLoginInfo[] {
  const filteredWebsites = availableWebsites;
  if (!filters.showHidden) {
    // filteredWebsites = filteredWebsites.filter(w => w.)
    // TODO Need to remove the hidden field from the entities and make it more of a global settings
  }

  return filteredWebsites;
}

export function AccountLoginContainer(
  props: AccountLoginContainerProps
): JSX.Element {
  const [isHiddenFilterOn, setHiddenFilter] = useLocalStorage(
    'show-hidden-accounts',
    false
  );

  const { isLoading, state, reload } = useStore(AccountStore);
  const { availableWebsites } = props;

  const toggleHiddenFilter = () => setHiddenFilter(!isHiddenFilterOn);

  const websites = filterWebsites(availableWebsites, {
    showHidden: isHiddenFilterOn || false,
  });

  return (
    <div className="account-login-container">
      <div className="account-login-filters">
        <EuiFilterGroup compressed>
          <EuiFilterButton
            aria-label="Show hidden accounts filter"
            hasActiveFilters={isHiddenFilterOn}
            onClick={toggleHiddenFilter}
          >
            <FormattedMessage
              id="account.login.hidden-filter"
              defaultMessage="Show hidden"
            />
          </EuiFilterButton>
        </EuiFilterGroup>
      </div>
      <EuiSpacer />
      <div className="account-login-list">hi</div>
    </div>
  );
}

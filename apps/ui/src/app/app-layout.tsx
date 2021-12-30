import './app.css';
import {
  EuiPage,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageSideBar,
  EuiHeader,
  EuiHeaderLogo,
} from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import StoreManager from '../stores/store-manager';
import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import useStore from '../stores/use-store';

const getAccountData = async () => {
  const res = await fetch('https://localhost:9487/api/account');
  return await res.json();
};

const AccountStore = new StoreManager<{}>(ACCOUNT_UPDATES, getAccountData);

export default function AppLayout() {
  const { isLoading, state, reload } = useStore(AccountStore);

  console.log(isLoading, state, reload);
  return (
    <>
      <EuiHeader>
        <EuiHeaderLogo
          iconTitle="PostyBirb"
          iconType={() => (
            <img
              className="euiIcon euiIcon--large euiHeaderLogo__icon"
              src="/assets/app-icon.png"
            />
          )}
        >
          PostyBirb
        </EuiHeaderLogo>
      </EuiHeader>
      <EuiPage paddingSize="none">
        <EuiPageSideBar sticky></EuiPageSideBar>
        <EuiPageContent
          hasBorder={false}
          hasShadow={false}
          paddingSize="none"
          borderRadius="none"
        >
          <EuiPageContentBody restrictWidth>
            <FormattedMessage id="message" defaultMessage="testing" />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPage>
    </>
  );
}

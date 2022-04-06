import { useQuery } from 'react-query';
import WebsitesApi from '../../api/websites.api';
import { AccountStore } from '../../stores/account.store';
import useStore from '../../stores/use-store';

export function AccountLoginContainer() {
  const { isLoading, state, reload } = useStore(AccountStore);
  const availableWebsiteQuery = useQuery(
    'available-websites',
    WebsitesApi.getLoginInfo
  );
  return null;
}

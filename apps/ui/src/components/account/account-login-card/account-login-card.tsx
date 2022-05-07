import { EuiCard } from '@elastic/eui';
import { IAccountDto } from '@postybirb/dto';
import { useToggle } from 'react-use';
import { DisplayableWebsiteLoginInfo } from '../../../models/displayable-website-login-info';
import AccountLoginCardAccountTable from './account-login-card-account-table';
import AccountLoginCardTitle from './account-login-card-title';
import './account-login-card.css';
import CreateAccountModal from './create-account-modal';

type AccountLoginCardProps = {
  website: DisplayableWebsiteLoginInfo;
  instances: IAccountDto[];
  groups: string[];
  onHide: (website: DisplayableWebsiteLoginInfo) => void;
};

export default function AccountLoginCard(
  props: AccountLoginCardProps
): JSX.Element {
  const { instances, website, groups } = props;
  const [isCreateDialogVisible, toggle] = useToggle(false);

  const onAddClicked = () => {
    toggle(true);
  };

  const createAccountModalForm = isCreateDialogVisible ? (
    <CreateAccountModal
      website={website}
      groups={groups}
      onClose={() => {
        toggle(false);
      }}
    />
  ) : null;

  return (
    <EuiCard
      hasBorder
      textAlign="left"
      title={<AccountLoginCardTitle {...props} onAddClick={onAddClicked} />}
    >
      <AccountLoginCardAccountTable instances={instances} groups={groups} />
      {createAccountModalForm}
    </EuiCard>
  );
}

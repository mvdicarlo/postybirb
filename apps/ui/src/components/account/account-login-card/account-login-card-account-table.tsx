import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiHealth,
} from '@elastic/eui';
import { IAccountDto, ILoginState } from '@postybirb/dto';
import { FormattedMessage } from 'react-intl';
import {
  ClearAccountDataPopover,
  DeleteAccountPopover,
} from './account-table-actions';

type AccountLoginCardAccountTableProps = {
  instances: IAccountDto[];
};

export default function AccountLoginCardAccountTable(
  props: AccountLoginCardAccountTableProps
) {
  const { instances } = props;

  const columns: EuiBasicTableColumn<IAccountDto>[] = [
    {
      field: 'name',
      name: <FormattedMessage id="name" defaultMessage="Name" />,
    },
    {
      field: 'loginState',
      name: <FormattedMessage id="status" defaultMessage="Status" />,
      render: (item: unknown) => {
        const { isLoggedIn, username, pending } = item as ILoginState;
        if (isLoggedIn) {
          return <EuiHealth color="success">{username}</EuiHealth>;
        }

        if (pending) {
          return (
            <EuiHealth color="primary">
              <FormattedMessage
                id="login.pending-login"
                defaultMessage="Checking..."
              />
            </EuiHealth>
          );
        }

        return (
          <EuiHealth color="danger">
            <FormattedMessage
              id="login.not-logged-in"
              defaultMessage="Not logged in"
            />
          </EuiHealth>
        );
      },
    },
    {
      field: 'groups',
      name: <FormattedMessage id="groups" defaultMessage="Groups" />,
      render: (groups: string[]) => (
        <>
          {groups.map((group) => (
            <EuiBadge key={group} color="primary">
              {group}
            </EuiBadge>
          ))}
        </>
      ),
    },
    {
      field: 'id',
      name: <FormattedMessage id="actions" defaultMessage="Actions" />,
      render: (id: string) => (
        <span>
          <EuiButton color="primary" className="mr-2" size="s">
            <FormattedMessage id="login" defaultMessage="Login" />
          </EuiButton>
          <ClearAccountDataPopover id={id} />
          <DeleteAccountPopover id={id} />
        </span>
      ),
    },
  ];

  if (!instances.length) {
    return null;
  }

  return <EuiBasicTable items={instances} columns={columns} />;
}

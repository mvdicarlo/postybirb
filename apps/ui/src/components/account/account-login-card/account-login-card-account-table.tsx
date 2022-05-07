import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiHealth,
  EuiToolTip,
} from '@elastic/eui';
import { IAccountDto, ILoginState } from '@postybirb/dto';
import AccountApi from 'apps/ui/src/api/account.api';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useToggle } from 'react-use';
import {
  ClearAccountDataPopover,
  DeleteAccountPopover,
} from './account-table-actions';

type AccountLoginCardAccountTableProps = {
  instances: IAccountDto[];
};

function NameColumn(props: {
  name: string;
  onNameUpdate: (name: string) => void;
}) {
  const { name, onNameUpdate } = props;
  const [isEditing, toggleEditing] = useToggle(false);
  const [editedName, setEditedName] = useState<string>(name);

  if (isEditing) {
    const isNameEditValid = !!editedName && editedName.trim().length > 0;
    return (
      <EuiFieldText
        placeholder={name}
        defaultValue={editedName}
        value={editedName}
        onChange={(event) => setEditedName(event.target.value)}
        onKeyPress={(event) => {
          if (event.key === 'Enter' && isNameEditValid) {
            onNameUpdate(editedName.trim());
            toggleEditing(false);
          }
        }}
        append={
          <EuiButtonIcon
            iconType="save"
            onClick={() => {
              onNameUpdate(editedName.trim());
              toggleEditing(false);
            }}
            disabled={!isNameEditValid}
          />
        }
      />
    );
  }

  return (
    <>
      <span>{name}</span>
      <EuiToolTip
        content={<FormattedMessage id="edit" defaultMessage="Edit" />}
      >
        <EuiButtonIcon iconType="pencil" onClick={() => toggleEditing(true)} />
      </EuiToolTip>
    </>
  );
}

export default function AccountLoginCardAccountTable(
  props: AccountLoginCardAccountTableProps
) {
  const { instances } = props;

  const columns: EuiBasicTableColumn<IAccountDto>[] = [
    {
      field: 'name',
      name: <FormattedMessage id="name" defaultMessage="Name" />,
      render: (name: string, record: IAccountDto<unknown>) => (
        <NameColumn
          key={name}
          name={name}
          onNameUpdate={(updatedName: string) => {
            AccountApi.update(record.id, {
              name: updatedName,
            });
          }}
        />
      ),
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

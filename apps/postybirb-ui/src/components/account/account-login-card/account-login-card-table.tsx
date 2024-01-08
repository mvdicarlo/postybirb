import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiHealth,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { IAccountDto, ILoginState, IWebsiteInfoDto } from '@postybirb/types';
import { useState } from 'react';
import { Trans } from '@lingui/macro';
import { useToggle } from 'react-use';
import accountApi from '../../../api/account.api';
import { getCustomLoginComponent } from '../../../website-components/custom-login-components';
import { PencilIcon, SaveIcon } from '../../shared/icons/Icons';
import AccountLoginModal from '../account-login-modal/account-login-modal';
import AccountLoginWebview from '../account-login-webview/account-login-webview';
import {
  ClearAccountDataPopover,
  DeleteAccountPopover,
} from './account-table-actions';

type AccountLoginCardAccountTableProps = {
  instances: IAccountDto[];
  groups: string[];
  website: IWebsiteInfoDto;
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
            aria-label="Save"
            iconType={SaveIcon}
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
      <EuiToolTip content={<Trans>Edit</Trans>}>
        <EuiButtonIcon
          aria-label="Edit"
          iconType={PencilIcon}
          onClick={() => toggleEditing(true)}
        />
      </EuiToolTip>
    </>
  );
}

function GroupsColumn(props: {
  groups: string[];
  allGroups: string[];
  onGroupsUpdate: (groups: string[]) => void;
}) {
  const { groups, allGroups, onGroupsUpdate } = props;
  const [groupOptions, setGroupOptions] = useState<
    EuiComboBoxOptionOption<string>[]
  >(
    allGroups.map((group) => ({
      value: group,
      label: group,
      key: group,
    }))
  );
  const [selectedGroups, setSelectedGroups] = useState<
    EuiComboBoxOptionOption<string>[]
  >(
    groups.map((group) => ({
      value: group,
      label: group,
      key: group,
    }))
  );
  const [isEditing, toggleEditing] = useToggle(false);

  if (isEditing) {
    const onGroupCreate = (value: string) => {
      const foundTag = groupOptions.find((t) => t.value === value);
      if (foundTag) {
        setSelectedGroups([...selectedGroups, foundTag]);
      } else {
        const group = {
          label: value,
          key: value,
          value,
        };
        setGroupOptions([...groupOptions, group]);
        setSelectedGroups([...selectedGroups, group]);
      }
    };

    return (
      <>
        <EuiComboBox
          style={{ padding: '0.25em' }}
          isClearable
          options={groupOptions}
          selectedOptions={selectedGroups}
          onCreateOption={onGroupCreate}
          onChange={(values) => {
            setSelectedGroups(values);
          }}
        />
        <EuiButtonIcon
          aria-label="save"
          style={{ marginLeft: '4px' }}
          iconType={SaveIcon}
          onClick={() => {
            onGroupsUpdate(selectedGroups.map((g) => g.value as string));
            toggleEditing(false);
          }}
        />
      </>
    );
  }

  return (
    <span className="flex-wrap">
      {groups.map((group) => (
        <EuiBadge key={group} color="primary">
          {group}
        </EuiBadge>
      ))}
      <EuiButtonIcon
        aria-label="edit"
        style={{ marginLeft: '4px' }}
        iconType={PencilIcon}
        onClick={() => toggleEditing(true)}
      />
    </span>
  );
}

function AccountLoginAction(props: {
  account: IAccountDto<unknown>;
  website: IWebsiteInfoDto;
}) {
  const { account, website } = props;
  const [isVisible, setIsVisible] = useState<boolean>(false);

  let loginMethod: JSX.Element = <div>No login component found.</div>;

  if (website.loginType.type === 'user') {
    loginMethod = (
      <AccountLoginWebview src={website.loginType.url} id={account.id} />
    );
  } else if (website.loginType.type === 'custom') {
    const CustomLoginComponent = getCustomLoginComponent(
      website.loginType.loginComponentName
    );

    if (CustomLoginComponent !== undefined) {
      loginMethod = (
        <CustomLoginComponent account={account} website={website} />
      );
    }
  }

  const modal = isVisible ? (
    <AccountLoginModal
      account={account}
      website={website}
      onClose={() => {
        setIsVisible(false);
        accountApi.refreshLogin(account.id);
      }}
    >
      {loginMethod}
    </AccountLoginModal>
  ) : null;

  return (
    <>
      <EuiButton
        color="primary"
        className="mr-2"
        size="s"
        onClick={() => {
          setIsVisible(true);
        }}
      >
        <Trans context="action">Login</Trans>
      </EuiButton>
      {modal}
    </>
  );
}

function AccountActions(props: {
  account: IAccountDto<unknown>;
  website: IWebsiteInfoDto;
}) {
  const { account, website } = props;
  const { id } = account;
  return (
    <span>
      <AccountLoginAction account={account} website={website} />
      <ClearAccountDataPopover id={id} />
      <DeleteAccountPopover id={id} />
    </span>
  );
}

export default function AccountLoginCardTable(
  props: AccountLoginCardAccountTableProps
) {
  const { instances, groups, website } = props;

  const columns: EuiBasicTableColumn<IAccountDto>[] = [
    {
      field: 'name',
      name: <Trans comment="Login account name">Name</Trans>,
      render: (name: string, record: IAccountDto<unknown>) => (
        <NameColumn
          key={name}
          name={name}
          onNameUpdate={(updatedName: string) => {
            accountApi.update(record.id, {
              name: updatedName,
              groups: record.groups,
            });
          }}
        />
      ),
    },
    {
      field: 'state',
      name: <Trans comment="Login status">Status</Trans>,
      render: (item: unknown) => {
        const { isLoggedIn, username, pending } = item as ILoginState;
        if (isLoggedIn) {
          return (
            <EuiHealth color="success">
              {username || <EuiIcon type="check" />}
            </EuiHealth>
          );
        }

        if (pending) {
          return (
            <EuiHealth color="primary">
              <Trans comment="Login status checking">Checking...</Trans>
            </EuiHealth>
          );
        }

        return (
          <EuiHealth color="danger">
            <Trans comment="Login status">Not logged in</Trans>
          </EuiHealth>
        );
      },
    },
    {
      field: 'groups',
      name: <Trans>Groups</Trans>,
      render: (accountGroups: string[], record: IAccountDto<unknown>) => (
        <GroupsColumn
          groups={accountGroups}
          allGroups={groups}
          onGroupsUpdate={(updatedGroups: string[]) => {
            accountApi.update(record.id, {
              name: record.name,
              groups: updatedGroups,
            });
          }}
        />
      ),
    },
    {
      field: 'id',
      name: <Trans>Actions</Trans>,
      render: (id: string, record: IAccountDto<unknown>) => (
        <AccountActions account={record} website={website} />
      ),
    },
  ];

  if (!instances.length) {
    return null;
  }

  return <EuiBasicTable items={instances} columns={columns} />;
}

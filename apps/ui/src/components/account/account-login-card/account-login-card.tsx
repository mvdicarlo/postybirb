import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCard,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { IAccountDto } from '@postybirb/dto';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useToggle } from 'react-use';
import AccountApi from '../../../api/account.api';
import { DisplayableWebsiteLoginInfo } from '../../../models/displayable-website-login-info';
import ErrorAlert from '../../shared/error-alert/error-alert';
import './account-login-card.css';

type AccountLoginCardProps = {
  website: DisplayableWebsiteLoginInfo;
  instances: IAccountDto[];
  onHide: (website: DisplayableWebsiteLoginInfo) => void;
};

const IsAccountNameValid = (accountName: string): boolean | undefined => {
  if (accountName === '') {
    return undefined;
  }

  // Account name must be provided and greater than 0 characters (trimmed)
  if (accountName && accountName.length) {
    if (accountName.trim().length > 0) {
      return true;
    }
  }

  return false;
};

function CreateAccountModal(props: {
  isVisible: boolean;
  website: DisplayableWebsiteLoginInfo;
  onClose: () => void;
}) {
  const { isVisible, website, onClose } = props;
  const [accountName, setAccountName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [responseError, setResponseError] = useState<string>();

  if (!isVisible) {
    return null;
  }

  const onCloseModal = () => {
    onClose();
    setAccountName('');
    setIsCreating(false);
    setResponseError(undefined);
  };

  const formId = 'create-account-form';

  return (
    <EuiModal onClose={onCloseModal} initialFocus="[name=accountName]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{website.displayName}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <ErrorAlert error={responseError} />
        <EuiForm
          id={formId}
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            setIsCreating(true);
            AccountApi.create({
              name: accountName,
              website: website.id,
            })
              .then(() => {
                onCloseModal();
              })
              .catch(({ error }) => {
                setResponseError(JSON.stringify(error, null, 1));
              });
          }}
        >
          <EuiFormRow
            label={<FormattedMessage id="name" defaultMessage="Name" />}
          >
            <EuiFieldText
              name="accountName"
              required
              value={accountName}
              isInvalid={!IsAccountNameValid(accountName)}
              minLength={1}
              maxLength={64}
              onChange={(event) => {
                setAccountName(event.target.value);
              }}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCloseModal} disabled={isCreating}>
          Cancel
        </EuiButtonEmpty>
        <EuiButton
          type="submit"
          form={formId}
          fill
          isLoading={isCreating}
          disabled={!accountName.length}
        >
          <FormattedMessage id="add" defaultMessage="Add" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

function LoginCardTitle(
  props: AccountLoginCardProps & {
    onAddClick: () => void;
  }
) {
  const { website, onHide, onAddClick } = props;
  const { displayName } = website;

  return (
    <div className="login-card-title">
      <span className="align-middle">{displayName}</span>
      <span className="float-right">
        <EuiButton
          iconType="plus"
          aria-label={`Add account for ${displayName}`}
          onClick={onAddClick}
        >
          <FormattedMessage
            id="login.add-account"
            defaultMessage="Add account"
          />
        </EuiButton>
        {website.isHidden ? (
          <EuiButtonIcon
            iconType="eye"
            aria-label={`Hide ${displayName}`}
            onClick={() => {
              onHide(website);
            }}
          />
        ) : (
          <EuiButtonIcon
            iconType="eyeClosed"
            aria-label={`Unhide ${displayName}`}
            onClick={() => {
              onHide(website);
            }}
          />
        )}
      </span>
    </div>
  );
}

function LoginCardAccountTable(props: { instances: IAccountDto[] }) {
  const { instances } = props;

  const columns: EuiBasicTableColumn<IAccountDto>[] = [
    {
      field: 'name',
      name: <FormattedMessage id="name" defaultMessage="Name" />,
    },
  ];

  const getRowProps = (item: IAccountDto) => {
    const { id } = item;
    return {
      'data-id': id,
      onClick: () => {
        console.log(item);
      },
    };
  };

  if (!instances.length) {
    return null;
  }

  return (
    <EuiBasicTable items={instances} columns={columns} rowProps={getRowProps} />
  );
}

export default function AccountLoginCard(
  props: AccountLoginCardProps
): JSX.Element {
  const { instances, website } = props;
  const [isCreateDialogVisible, toggle] = useToggle(false);

  const onAddClicked = () => {
    toggle(true);
  };

  return (
    <EuiCard
      hasBorder
      textAlign="left"
      // display="subdued"
      title={<LoginCardTitle {...props} onAddClick={onAddClicked} />}
    >
      <LoginCardAccountTable instances={instances} />
      <CreateAccountModal
        isVisible={isCreateDialogVisible}
        website={website}
        onClose={() => {
          toggle(false);
        }}
      />
    </EuiCard>
  );
}
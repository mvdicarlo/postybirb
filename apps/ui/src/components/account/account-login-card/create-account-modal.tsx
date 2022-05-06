import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import AccountApi from '../../../api/account.api';
import { DisplayableWebsiteLoginInfo } from '../../../models/displayable-website-login-info';
import ErrorAlert from '../../shared/error-alert/error-alert';

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

type CreateAccountModalProps = {
  website: DisplayableWebsiteLoginInfo;
  groups: string[]; // A list of all created groups
  onClose: () => void;
};

const formId = 'create-account-form';

export default function CreateAccountModal(props: CreateAccountModalProps) {
  const { website, groups, onClose } = props;
  const [accountName, setAccountName] = useState<string>('');
  const [groupOptions, setGroupOptions] = useState<
    EuiComboBoxOptionOption<string>[]
  >(
    groups.map((group) => ({
      value: group,
      label: group,
      key: group,
    }))
  );
  const [selectedGroups, setSelectedGroups] = useState<
    EuiComboBoxOptionOption<string>[]
  >([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [responseError, setResponseError] = useState<string>();

  const onCloseModal = () => {
    onClose();
    setAccountName('');
    setIsCreating(false);
    setResponseError(undefined);
  };

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
              groups: selectedGroups
                .filter((group) => !!group.value)
                .map((group) => group.value as string),
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
          <EuiFormRow
            label={<FormattedMessage id="tags" defaultMessage="Tags" />}
          >
            <EuiComboBox
              isClearable
              options={groupOptions}
              selectedOptions={selectedGroups}
              onCreateOption={onGroupCreate}
              onChange={(values) => {
                setSelectedGroups(values);
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

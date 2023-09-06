import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiForm,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { FormBuilderMetadata } from '@postybirb/form-builder';
import { AccountId, DynamicObject, SubmissionType } from '@postybirb/types';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import userSpecifiedWebsiteOptionsApi from '../../../../../api/user-specified-website-options.api';
import { useToast } from '../../../../../app/app-toast-provider';

type UserSpecifiedWebsiteOptionsSaveModalProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: FormBuilderMetadata<any>;
  type: SubmissionType;
  accountId: AccountId;
  options: DynamicObject;
  onClose: () => void;
};

const formId = 'user-specified-website-options-select-form';

function getDefaultState(options: DynamicObject): Record<string, boolean> {
  const obj: Record<string, boolean> = {};
  Object.entries(options).forEach(([key, value]) => {
    let hasValue = true;

    if (value === undefined || value === '') {
      hasValue = false;
    }

    obj[key] = hasValue;
  });
  return obj;
}

export default function UserSpecifiedWebsiteOptionsSaveModal(
  props: UserSpecifiedWebsiteOptionsSaveModalProps
) {
  const { accountId, type, form, options, onClose } = props;
  const [isSaving, setIsSaving] = useState(false);
  const { addToast, addErrorToast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState(
    getDefaultState(options)
  );

  const onCloseModal = () => {
    onClose();
    setIsSaving(false);
  };

  const pickerFormFields = Object.entries(form)
    .map(([key, value]) => ({ key, value: value[0] }))
    .sort((a, b) => {
      const value1 = a.value;
      const value2 = b.value;

      return (value1.row ?? 1000) - (value2.row ?? 1000);
    })
    .map(({ key, value }) => (
      <EuiCheckbox
        checked={selectedOptions[key]}
        id={key}
        label={value.label}
        onChange={() => {
          setSelectedOptions({
            ...selectedOptions,
            [key]: !selectedOptions[key],
          });
        }}
      />
    ));

  return (
    <EuiModal onClose={onCloseModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="user-specified-options.modal.header"
            defaultMessage="Choose Fields"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm
          id={formId}
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            setIsSaving(true);
            // Create copy to allow filtering of user selected fields
            const copy: DynamicObject = JSON.parse(JSON.stringify(options));
            Object.entries(selectedOptions).forEach(([key, isSelected]) => {
              if (!isSelected) {
                delete copy[key];
              }
            });

            userSpecifiedWebsiteOptionsApi
              .create({
                account: accountId,
                type,
                options: copy,
              })
              .then(() => {
                addToast({
                  id: Date.now().toString(),
                  text: (
                    <FormattedMessage
                      id="default-options-saved"
                      defaultMessage="Defaults saved"
                    />
                  ),
                });
              })
              .catch((err) => {
                addErrorToast(err);
              })
              .finally(() => {
                onCloseModal();
              });
          }}
        >
          {pickerFormFields}
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCloseModal} disabled={isSaving}>
          <FormattedMessage id="cancel" defaultMessage="Cancel" />
        </EuiButtonEmpty>
        <EuiButton
          type="submit"
          form={formId}
          fill
          isLoading={isSaving}
          disabled={isSaving}
        >
          <FormattedMessage id="save" defaultMessage="Save" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

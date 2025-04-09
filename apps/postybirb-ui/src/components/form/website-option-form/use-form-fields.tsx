import { Trans } from '@lingui/macro';
import { Box, Loader } from '@mantine/core';
import { FormBuilderMetadata } from '@postybirb/form-builder';
import { IWebsiteFormFields, WebsiteOptionsDto } from '@postybirb/types';
import { debounce } from 'lodash';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useQuery } from 'react-query';
import formGeneratorApi from '../../../api/form-generator.api';
import websiteOptionsApi from '../../../api/website-options.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';

type FormFieldsContextType = {
  values: Record<string, unknown>;
  formFields: FormBuilderMetadata;
  setFieldValue: (key: string, value: unknown) => void;
  resetFields: (initialValues: Record<string, unknown>) => void;
  isLoading: boolean;
};

const FormFieldsContext = createContext<FormFieldsContextType | undefined>(
  undefined,
);

export function FormFieldsProvider({
  option,
  submission,
  children,
}: {
  option: WebsiteOptionsDto;
  submission: SubmissionDto;
  children: React.ReactNode;
}) {
  const { accountId } = option;
  const {
    isLoading,
    data: formFields,
    refetch,
  } = useQuery(`website-option-${option.id}`, () =>
    formGeneratorApi
      .getForm({
        accountId,
        optionId: option.id,
        type: submission.type,
        isMultiSubmission: submission.isMultiSubmission,
      })
      .then((res) => res.body),
  );

  const [values, setValues] = useState<Record<string, unknown>>({});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveDelayed = useCallback(
    debounce(
      (updatedValues) =>
        websiteOptionsApi.update(option.id, {
          data: updatedValues as IWebsiteFormFields,
        }),
      600,
    ),
    [],
  );

  const save = useCallback(
    (updatedValues: Record<string, unknown>) =>
      websiteOptionsApi.update(option.id, {
        data: updatedValues as unknown as IWebsiteFormFields,
      }),
    [option.id],
  );

  const setFieldValue = useCallback(
    (key: string, value: unknown) => {
      const newValues = { ...values, [key]: value };
      if (
        key === 'description' ||
        key === 'contentWarning' ||
        (typeof value === 'string' && key !== 'rating')
      ) {
        // Save after debounce if the field is a string or description
        saveDelayed(newValues);
      } else {
        save(newValues);
      }
      setValues(newValues);
    },
    [values, save, saveDelayed],
  );

  const resetFields = useCallback(
    (newInitialValues: Record<string, unknown>) => {
      setValues(newInitialValues);
    },
    [],
  );

  // Automatically reset fields when formFields change
  useEffect(() => {
    if (option.data) {
      const initialValues = {
        ...option.data,
      };
      resetFields(initialValues);
    }
  }, [option, resetFields]);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option.updatedAt]);

  const contextValue = useMemo(
    () => ({
      formFields: formFields ?? {},
      values,
      setFieldValue,
      resetFields,
      isLoading,
    }),
    [formFields, values, setFieldValue, resetFields, isLoading],
  );

  if (isLoading) {
    return <Loader />;
  }

  if (!formFields) {
    return (
      <Box option-id={option.id}>
        <Trans>Unable to display form</Trans>
      </Box>
    );
  }

  return (
    <FormFieldsContext.Provider value={contextValue}>
      {children}
    </FormFieldsContext.Provider>
  );
}

export const useFormFields = (): FormFieldsContextType => {
  const context = useContext(FormFieldsContext);
  if (!context) {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    throw new Error('useFormFields must be used within a FormFieldsProvider');
  }
  return context;
};

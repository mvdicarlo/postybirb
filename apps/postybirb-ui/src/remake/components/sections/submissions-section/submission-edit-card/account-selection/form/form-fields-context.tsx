/**
 * FormFieldsContext - Provides form field metadata and state for website option forms.
 */

import {
    FieldAggregateType,
    FormBuilderMetadata,
} from '@postybirb/form-builder';
import {
    SubmissionType,
    WebsiteOptionsDto,
} from '@postybirb/types';
import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useMemo,
    useRef,
} from 'react';
import { useQuery } from 'react-query';
import formGeneratorApi from '../../../../../../api/form-generator.api';
import websiteOptionsApi from '../../../../../../api/website-options.api';
import type { SubmissionRecord } from '../../../../../../stores/records';

interface FormFieldsContextValue {
  /** Form field metadata from API */
  formFields: FormBuilderMetadata | undefined;
  /** Loading state for form fields */
  isLoading: boolean;
  /** Error state for form fields */
  isError: boolean;
  /** The website option being edited */
  option: WebsiteOptionsDto;
  /** The submission containing this option */
  submission: SubmissionRecord;
  /** Get a field by name */
  getField: (name: string) => FieldAggregateType | undefined;
  /** Get current value for a field */
  getValue: <T = unknown>(name: string) => T;
  /** Update a field value */
  setValue: (name: string, value: unknown) => void;
}

const FormFieldsContext = createContext<FormFieldsContextValue | null>(null);

interface FormFieldsProviderProps extends PropsWithChildren {
  option: WebsiteOptionsDto;
  submission: SubmissionRecord;
}

export function FormFieldsProvider({
  option,
  submission,
  children,
}: FormFieldsProviderProps) {
  // Debounce timer ref for save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch form metadata from API
  const {
    data: formFields,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      'form-fields',
      option.accountId,
      submission.type,
      submission.files.length > 1,
    ],
    queryFn: async () => {
      const response = await formGeneratorApi.getForm({
        accountId: option.accountId,
        type: submission.type as SubmissionType,
        isMultiSubmission: submission.files.length > 1,
      });
      return response.body;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get a field by name
  const getField = useCallback(
    (name: string): FieldAggregateType | undefined => {
      if (!formFields) return undefined;
      return formFields[name];
    },
    [formFields],
  );

  // Get current value for a field from the option data
  const getValue = useCallback(
    <T = unknown,>(name: string): T => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (option.data as any)[name] as T;
    },
    [option.data],
  );

  // Update a field value with debounced save
  const setValue = useCallback(
    (name: string, value: unknown) => {
      // Clear any pending save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Schedule the save with debounce
      saveTimerRef.current = setTimeout(() => {
        const updatedData = {
          ...option.data,
          [name]: value,
        };

        websiteOptionsApi.update(option.id, { data: updatedData });
      }, 300);
    },
    [option.id, option.data],
  );

  const contextValue = useMemo<FormFieldsContextValue>(
    () => ({
      formFields,
      isLoading,
      isError,
      option,
      submission,
      getField,
      getValue,
      setValue,
    }),
    [
      formFields,
      isLoading,
      isError,
      option,
      submission,
      getField,
      getValue,
      setValue,
    ],
  );

  return (
    <FormFieldsContext.Provider value={contextValue}>
      {children}
    </FormFieldsContext.Provider>
  );
}

export function useFormFieldsContext(): FormFieldsContextValue {
  const context = useContext(FormFieldsContext);
  if (!context) {
    throw new Error(
      'useFormFieldsContext must be used within a FormFieldsProvider',
    );
  }
  return context;
}

/**
 * FormFieldsContext - Provides form field metadata and state for website option forms.
 */

import { notifications } from '@mantine/notifications';
import {
    FieldAggregateType,
    FormBuilderMetadata,
} from '@postybirb/form-builder';
import { SubmissionType, WebsiteOptionsDto } from '@postybirb/types';
import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
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
  // Local state for optimistic updates - provides instant UI feedback
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});

  // Debounce timer ref for save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the option.id to reset local state when switching options
  const optionIdRef = useRef(option.id);

  // Sync local state when option changes (server confirmed update or option switch)
  useEffect(() => {
    if (optionIdRef.current !== option.id) {
      // Switching to different option - reset local values
      optionIdRef.current = option.id;
      setLocalValues({});
    } else {
      // Server confirmed update - clear local overrides for synced values
      setLocalValues((prev) => {
        const newLocal: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(prev)) {
          // Keep local value only if it differs from server (pending update)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((option.data as any)[key] !== value) {
            newLocal[key] = value;
          }
        }
        return Object.keys(newLocal).length > 0 ? newLocal : {};
      });
    }
  }, [option.id, option.data]);

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

  // Get current value for a field - prefers local optimistic value over server value
  const getValue = useCallback(
    <T = unknown,>(name: string): T => {
      // Local value takes precedence (optimistic update)
      if (name in localValues) {
        return localValues[name] as T;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (option.data as any)[name] as T;
    },
    [option.data, localValues],
  );

  // Update a field value with immediate local update and debounced server save
  const setValue = useCallback(
    (name: string, value: unknown) => {
      // IMMEDIATE local update for UI responsiveness
      setLocalValues((prev) => ({ ...prev, [name]: value }));

      // Clear any pending save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Determine debounce time based on value type
      // Booleans/selects: 150ms (quick confirmation)
      // Text fields: 500ms (wait for typing to stop)
      const debounceTime = typeof value === 'string' ? 500 : 150;

      // Schedule the save with debounce
      saveTimerRef.current = setTimeout(async () => {
        try {
          // Merge all local values with option data for the update
          const updatedData = {
            ...option.data,
            ...localValues,
            [name]: value,
          };

          await websiteOptionsApi.update(option.id, { data: updatedData });
        } catch (error) {
          // Show error toast on API failure
          notifications.show({
            title: 'Update failed',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to save changes',
            color: 'red',
          });
        }
      }, debounceTime);
    },
    [option.id, option.data, localValues],
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
      // eslint-disable-next-line lingui/no-unlocalized-strings
      'useFormFieldsContext must be used within a FormFieldsProvider',
    );
  }
  return context;
}

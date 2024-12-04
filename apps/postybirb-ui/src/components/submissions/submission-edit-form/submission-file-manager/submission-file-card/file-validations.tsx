import { Alert, List } from '@mantine/core';
import {
  IAccountDto,
  ISubmissionFileDto,
  ValidationResult,
} from '@postybirb/types';
import { IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useWebsites } from '../../../../../hooks/account/use-websites';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { ValidationTranslation } from '../../../../translations/validation-translation';

type FileValidationsProps = {
  submission: SubmissionDto;
  file: ISubmissionFileDto;
};

type ModifiedValidationResult = Required<ValidationResult> & {
  account: IAccountDto;
};

function PerAccountValidationList({
  validations,
}: {
  validations: ModifiedValidationResult;
}) {
  const { account } = validations;
  const items: Array<JSX.Element | null> = [
    <div key={account.websiteInfo.websiteDisplayName}>
      {account.websiteInfo.websiteDisplayName}
    </div>,
    validations.errors.length ? (
      <List
        key={`${account.id}-errors`}
        withPadding
        listStyleType="disc"
        spacing="xs"
        size="sm"
      >
        {validations.errors.map((error) => (
          <List.Item
            key={error.id}
            c="red"
            icon={<IconAlertCircle size="1rem" />}
          >
            <ValidationTranslation id={error.id} values={error.values} />
          </List.Item>
        ))}
      </List>
    ) : null,
    validations.warnings.length ? (
      <List
        key={`${account.id}-warnings`}
        withPadding
        listStyleType="disc"
        spacing="xs"
        size="sm"
      >
        {validations.warnings.map((warning) => (
          <List.Item
            key={warning.id}
            c="orange"
            icon={<IconAlertTriangle size="1rem" />}
          >
            <ValidationTranslation id={warning.id} values={warning.values} />
          </List.Item>
        ))}
      </List>
    ) : null,
  ];

  return items;
}

function ValidationList({
  validations,
}: {
  validations: ModifiedValidationResult[];
}) {
  return (
    <List spacing="xs" size="sm">
      {validations.map((validation) => (
        <PerAccountValidationList
          key={validation.id}
          validations={validation}
        />
      ))}
    </List>
  );
}

export function FileValidations(props: FileValidationsProps) {
  const { submission, file } = props;
  const { validations } = submission;
  const { accounts } = useWebsites();
  const filteredValidations = useMemo(() => {
    const fileValidations: ModifiedValidationResult[] = [];
    let hasFileValidations = false;
    validations.forEach((validation) => {
      const websiteOption = submission.options.find(
        (o) => o.id === validation.id,
      );
      if (!websiteOption) {
        return;
      }
      const account = accounts.find((a) => a.id === websiteOption.account);
      if (!account) {
        return;
      }

      const filteredResult: Required<ModifiedValidationResult> = {
        id: account.website,
        account,
        errors:
          validation.errors
            ?.filter((error) => error.field === 'files')
            .filter(
              (v) => 'fileId' in v.values && v.values.fileId === file.id,
            ) ?? [],
        warnings:
          validation.warnings
            ?.filter((warning) => warning.field === 'files')
            .filter(
              (v) => 'fileId' in v.values && v.values.fileId === file.id,
            ) ?? [],
      };

      if (filteredResult.errors.length || filteredResult.warnings.length) {
        const existing = fileValidations.find(
          (v) => v.id === filteredResult.id,
        );
        hasFileValidations = true;
        if (existing) {
          existing.errors.push(...filteredResult.errors);
          existing.warnings.push(...filteredResult.warnings);
        } else {
          fileValidations.push(filteredResult);
        }
      }
    });
    return { fileValidations, hasFileValidations };
  }, [accounts, file.id, submission.options, validations]);

  if (!filteredValidations.hasFileValidations) {
    return null;
  }

  return filteredValidations.fileValidations.length ? (
    <Alert variant="outline" color="orange">
      <ValidationList validations={filteredValidations.fileValidations} />
    </Alert>
  ) : null;
}

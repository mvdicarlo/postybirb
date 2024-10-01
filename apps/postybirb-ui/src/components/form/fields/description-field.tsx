import { Trans } from '@lingui/macro';
import { Box, Checkbox } from '@mantine/core';
import { DescriptionFieldType } from '@postybirb/form-builder';
import { DescriptionValue } from '@postybirb/types';
import { PostyBirbEditor } from '../../shared/postybirb-editor/postybirb-editor';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

export function DescriptionField(props: FormFieldProps<DescriptionFieldType>) {
  const { form, propKey, option } = props;
  const defaultOption = useDefaultOption<DescriptionValue>(props);
  const validations = useValidations(props);

  const overrideProps = form.getInputProps(`${propKey}.overrideDefault`);
  const insertTagsProps = form.getInputProps(`${propKey}.insertTags`);
  const insertTitleProps = form.getInputProps(`${propKey}.insertTitle`);
  const descriptionProps = form.getInputProps(`${propKey}.description`);

  return (
    <Box>
      <FieldLabel {...props} validationState={validations}>
        {defaultOption === undefined ? null : (
          <Checkbox
            mb="4"
            {...overrideProps}
            checked={overrideProps.defaultValue || false}
            label={<Trans>Use custom description</Trans>}
          />
        )}
        <Checkbox
          mb="4"
          {...insertTitleProps}
          checked={insertTitleProps.defaultValue || false}
          label={<Trans>Insert title at start</Trans>}
        />
        <Checkbox
          mb="4"
          {...insertTagsProps}
          checked={insertTagsProps.defaultValue || false}
          label={<Trans>Insert tags at end</Trans>}
        />
        {overrideProps.defaultValue || option.isDefault ? (
          <div style={{ position: 'relative' }}>
            <PostyBirbEditor
              value={descriptionProps.defaultValue || []}
              onChange={(descriptionValue) => {
                form.setFieldValue(`${propKey}.description`, descriptionValue);
              }}
            />
          </div>
        ) : null}
      </FieldLabel>
    </Box>
  );
}

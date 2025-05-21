import { ValidatorParams } from './validator.type';

export async function validateSelectFieldMinSelected({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();
  for (const [fieldName, selectField] of Object.entries(fields)) {
    if (selectField.formField !== 'select') continue;
    if (!selectField.allowMultiple) continue;

    const options = data.options[fieldName];
    const { minSelected } = selectField;
    if (!minSelected) continue;

    const selected = options?.length ?? 0;
    if (selected < minSelected) {
      result.errors.push({
        id: 'validation.select-field.min-selected',
        field: fieldName,
        values: {
          currentSelected: selected,
          minSelected,
        },
      });
    }
  }
}

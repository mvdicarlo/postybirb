# Add User Input Validations

In either scenario of supporting Message or File posting to a website, a validation method
must be implemented for the sake of checking that user provided data is within expected
limits. For simple forms, this can largely be a pass-thru as the application attempts to
handle many common scenarios out of the box through the use of validation-based decorators.

## Available Validation Decorators

- [Description](../../../apps/client-server/src/app/websites/decorators/supports-description.decorator.ts)
- [Files](../../../apps/client-server/src/app/websites/decorators/supports-files.decorator.ts)
- [Title](../../../apps/client-server/src/app/websites/decorators/supports-title.decorator.ts)

These can be appended to a class to get a lot of default behavior.
If you are curious about the implementation validators associated with these decorators
you can see the [validators](../../../apps/client-server/src/app/validation/validators/)
section.

## Validation Method Implementation

### Sample

```ts
// Basic sample with custom validation
class FooMessageSubmission implements IWebsiteFormFields {
  @TextField({
    label: 'hexColor',
    defaultValue: '#fff',
  })
  hexColor: string;
}

class Foo extends Website implements MessageWebsite<FooMessageSubmission> {
  async onValidateMessageSubmission(postData: PostData<MessageSubmission, FooMessageSubmission>): Promise<SimpleValidationResult> {
    const result: SimpleValidationResult<FooMessageSubmission> = {
      warnings: [],
      errors: [],
    };

    if (postData.options.hexColor.length !== 7) {
      result.errors.push({
        field: 'hexColor', // If you provide the field, it will automatically pair the validation in the UI near that field
        id: 'foo.validation.hex-color.invalid-length',
        values: {
          currentLength: postData.options.hexColor.length,
        },
      });
    }

    return result;
  }
}
```

```ts
// Pass-thru sample where no additional validations are needed
class Foo extends Website implements MessageWebsite<FooMessageSubmission> {
  async onValidateMessageSubmission(postData: PostData<MessageSubmission, FooMessageSubmission>): Promise<SimpleValidationResult> {
    return {};
  }
```

### The Difference Between Warning and Error

Validators can return two different types of validations that have different effects
within the application.

#### Warning

Warnings through validation are intended to inform the user that they may be missing
something optional that may be beneficial or to inform of the behavior of the application
potentially altering the outputs, such as needing to truncate a title down.

These do not block a post from being attempted.

#### Error

Errors through validation are determinations that some user input is missing or invalid.
This may be having an empty value in a required field. The presence of a validation error
will cause a post to fail.

### Custom Validation Translation Requirements

> [!IMPORTANT]
> If you do add a translation to the application, please run `yarn lingui:extract` before
> pushing to help ensure translations stay up-to-date.

PostyBirb attempts to make sure that everything can be translated for better user
experiences. It is not expected of developers to update translations across all
supported languages. So the aim is to only require modifying a few files when a custom
validation is required.

To support a new custom validation for translation you can follow the samples below.

```ts
// Within a validation method
result.errors.push({
  field: 'hexColor',
  id: 'foo.validation.hex-color.invalid-length',
  values: {
    currentLength: postData.options.hexColor.length,
  },
});
```

Update [Known Validations](../../../libs/types/src/models/submission/validation-result.type.ts).

```ts
export interface ValidationMessages {
  // ...
  'foo.validation.hex-color.invalid-length': {
    currentLength: number;
  };
}
```

Add english translation to [Validation Translations](../../../apps/postybirb-ui/src/components/translations/validation-translation.tsx)

```ts
  'foo.validation.hex-color.invalid-length': (props) => {
    const currentLength = props.values?.currentLength ?? 0;
    return (
      <Trans>Hex is greater than {currentLength} characters long</Trans>
    );
  },
```

# Defining Submission / Form Data

To reduce the amount of files that are required to be generated during the implementation
of a website V4 attempts to solve this issue through the specification of user inputs
through classes implementing the `IWebsiteFormFields` or `FileWebsiteFormFields` interfaces.

This is further enhanced through custom decorators that define metadata that the UI can use
to automatically generate the form the user sees.

## Supported Fields Types

This is likely to be a growing list with more rich features as more websites with
more dynamic requirements are implemented.

- **@BooleanField** - Checkbox
- **@DescriptionField** - Standard description field to be used for description retrieval.
- **@RadioField** - Radio Input (best used when only a few choices are available)
- **@RatingField** - Radio input used for the specific selection of a submission rating.
- **@SelectField** - Dropdown selection (best used when more than 5 choices are available)
- **@TagField** - Standard tag field to be used for tag retrieval.
- **@TextField** - Text / Text Area

## Defining Layout

Defining the general layout of the form generated is done with row / col fields to
support a simple grid system. It may need to be played around with to get a look you
are happy with.

As standard practice, please keep the common fields that most websites share in a similar
layout and at the top (description, rating, tag, title).

## Adding Translation for Custom Labels

```ts
  @BooleanField({ label: 'feature', defaultValue: true })
  feature: boolean;
```

When you need to add a custom named field, you will also need to provide a simple english
translation for it as well. `label` in this case is more of a translation identifier.

This is the most convenient solution until a better one can be found.

To add the `feature` label you need to update the following files.

**[field-translations](../../../libs/types/src/models/submission/field-translation.type.ts)**

```ts
export interface FieldTranslations {
  // ...
  feature: true; // Add this to the properties
  // ...
}
```

**[field-translations (ui)](../../../apps/postybirb-ui/src/components/translations/field-translations.ts)**

```ts
export const FieldLabelTranslations: {
  [K in keyof FieldTranslations]: MessageDescriptor;
} = {
  // ...
  feature: msg`Feature`, // Add this to the properties
  // ...
};
```

## Sample Submission Class

```ts
class FooFileSubmission implements FileWebsiteFormFields {
  @TextField({ label: 'title', required: true, row: 0, col: 1 })
  title: string;

  @TagField({ row: 2, col: 1 })
  tags: TagValue;

  @DescriptionField({ row: 3, col: 1 })
  description: DescriptionValue;

  @RatingField({ required: true, row: 0, col: 0 })
  rating: SubmissionRating;

  // This is a custom field that requires translation of the label 'feature'
  @BooleanField({ label: 'feature', defaultValue: true })
  feature: boolean;
}

class Foo extends Website<FooAccountData> implements FileWebsite<FooFileSubmission> {
  createFileModel(): FooFileSubmission {
    return new FooFileSubmission();
  }
}
```

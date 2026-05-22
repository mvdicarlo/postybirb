/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-classes-per-file */
import {
  BooleanField,
  DescriptionField,
  TagField,
  TextField,
} from './decorators';
import { formBuilder } from './form-builder';

describe('formBuilder', () => {
  it('should build boolean types', () => {
    class BooleanType {
      @BooleanField({ label: 'description' })
      public field = false;
    }

    expect(formBuilder(new BooleanType(), {})).toEqual({
      field: {
        label: 'description',
        defaultValue: false,
        type: 'boolean',
        formField: 'checkbox',
        section: 'website',
        responsive: {
          xs: 12,
        },
        order: 999,
        span: 12,
      },
    });
  });

  it('should derive', () => {
    class DescriptionType {
      @DescriptionField({
        label: 'description',
        derive: [{ key: 'v', populate: 'value' }],
      })
      public field = '';
    }

    expect(
      formBuilder(new DescriptionType(), { v: 'description value to derive' }),
    ).toMatchInlineSnapshot(`
      {
        "field": {
          "defaultValue": "",
          "derive": [
            {
              "key": "v",
              "populate": "value",
            },
          ],
          "descriptionType": "html",
          "formField": "description",
          "label": "description",
          "order": 999,
          "responsive": {
            "xs": 12,
          },
          "section": "website",
          "span": 12,
          "type": "description",
          "value": "description value to derive",
        },
      }
    `);
  });

  it('should derive in extended class', () => {
    class DescriptionType {
      @DescriptionField({
        label: 'description',
        derive: [{ key: 'v', populate: 'value' }],
      })
      public field = '';
    }

    class DescriptionTypeExtended extends DescriptionType {
      @BooleanField({ label: 'description' })
      public field2 = false;
    }

    expect(
      formBuilder(new DescriptionTypeExtended(), {
        v: 'description value to derive',
      }),
    ).toMatchInlineSnapshot(`
      {
        "field": {
          "defaultValue": "",
          "derive": [
            {
              "key": "v",
              "populate": "value",
            },
          ],
          "descriptionType": "html",
          "formField": "description",
          "label": "description",
          "order": 999,
          "responsive": {
            "xs": 12,
          },
          "section": "website",
          "span": 12,
          "type": "description",
          "value": "description value to derive",
        },
        "field2": {
          "defaultValue": false,
          "formField": "checkbox",
          "label": "description",
          "order": 999,
          "responsive": {
            "xs": 12,
          },
          "section": "website",
          "span": 12,
          "type": "boolean",
        },
      }
    `);
  });

  it('should call custom derive', () => {
    const fn = jest.fn();

    class DescriptionType {
      @DescriptionField({
        label: 'description',
        customDerive() {
          // @ts-expect-error
          this.defaultValue = 'AAAAA';
          this.responsive = { xs: 5 };
          fn();
        },
      })
      public field = '';
    }

    expect(formBuilder(new DescriptionType(), {})).toMatchInlineSnapshot(`
      {
        "field": {
          "defaultValue": "AAAAA",
          "descriptionType": "html",
          "formField": "description",
          "label": "description",
          "order": 999,
          "responsive": {
            "xs": 5,
          },
          "section": "website",
          "span": 12,
          "type": "description",
        },
      }
    `);
    expect(fn).toHaveBeenCalled();
  });

  it('should call custom derive in extended class', () => {
    const fn = jest.fn();

    class DescriptionType {
      @DescriptionField({
        label: 'description',
        customDerive() {
          // @ts-expect-error
          this.defaultValue = 'AAAAA';
          this.responsive = { xs: 5 };
          fn();
        },
      })
      public field = '';
    }

    class DescriptionTypeExtended extends DescriptionType {
      @BooleanField({ label: 'description' })
      public field2 = false;
    }

    expect(formBuilder(new DescriptionTypeExtended(), {}))
      .toMatchInlineSnapshot(`
      {
        "field": {
          "defaultValue": "AAAAA",
          "descriptionType": "html",
          "formField": "description",
          "label": "description",
          "order": 999,
          "responsive": {
            "xs": 5,
          },
          "section": "website",
          "span": 12,
          "type": "description",
        },
        "field2": {
          "defaultValue": false,
          "formField": "checkbox",
          "label": "description",
          "order": 999,
          "responsive": {
            "xs": 12,
          },
          "section": "website",
          "span": 12,
          "type": "boolean",
        },
      }
    `);
    expect(fn).toHaveBeenCalled();
  });

  it('should extend classes', () => {
    class BooleanType {
      @BooleanField({ label: 'description' })
      public field = false;
    }

    class ExtendedType extends BooleanType {
      @TextField({ label: 'description', section: 'website', span: 6 })
      public field2 = 'hello';

      @DescriptionField({ label: 'feature', descriptionType: 'html' })
      public field3: unknown;
    }

    class ExtendedAndOverrideType extends ExtendedType {
      @TextField({ label: 'title' })
      public field2 = 'Goodbye';

      @DescriptionField({ label: 'feature', descriptionType: 'markdown' })
      public field3: unknown;
    }

    expect(formBuilder(new BooleanType(), {})).toEqual({
      field: {
        label: 'description',
        defaultValue: false,
        type: 'boolean',
        formField: 'checkbox',
        section: 'website',
        responsive: {
          xs: 12,
        },
        order: 999,
        span: 12,
      },
    });

    expect(formBuilder(new ExtendedType(), {})).toEqual({
      field: {
        label: 'description',
        defaultValue: false,
        type: 'boolean',
        formField: 'checkbox',
        section: 'website',
        responsive: {
          xs: 12,
        },
        order: 999,
        span: 12,
      },
      field2: {
        label: 'description',
        defaultValue: 'hello',
        type: 'text',
        formField: 'input',
        section: 'website',
        order: 999,
        span: 6,
        responsive: {
          xs: 12,
        },
      },
      field3: {
        section: 'website',
        responsive: {
          xs: 12,
        },
        order: 999,
        span: 12,
        defaultValue: {
          description: { type: 'doc', content: [] },
          overrideDefault: false,
        },
        descriptionType: 'html',
        formField: 'description',
        label: 'feature',
        type: 'description',
      },
    });

    expect(formBuilder(new ExtendedAndOverrideType(), {})).toEqual({
      field: {
        label: 'description',
        defaultValue: false,
        type: 'boolean',
        formField: 'checkbox',
        section: 'website',
        responsive: {
          xs: 12,
        },
        order: 999,
        span: 12,
      },
      field2: {
        label: 'title',
        defaultValue: 'Goodbye',
        type: 'text',
        formField: 'input',
        section: 'website',
        order: 999,
        span: 6,
        responsive: {
          xs: 12,
        },
      },
      field3: {
        section: 'website',
        responsive: {
          xs: 12,
        },
        order: 999,
        span: 12,
        defaultValue: {
          description: { type: 'doc', content: [] },
          overrideDefault: false,
        },
        descriptionType: 'markdown',
        formField: 'description',
        label: 'feature',
        type: 'description',
      },
    });
  });

  it('should build text types', () => {
    class TextType {
      @TextField({ label: 'description' })
      public field = 'hello';
    }

    expect(formBuilder(new TextType(), {})).toEqual({
      field: {
        label: 'description',
        defaultValue: 'hello',
        type: 'text',
        formField: 'input',
        section: 'website',
        responsive: {
          xs: 12,
        },
        order: 999,
        span: 12,
      },
    });
  });

  it('should build tag fields', () => {
    class TestType {
      @TagField({})
      field: string[];
    }

    expect(formBuilder(new TestType(), {})).toMatchInlineSnapshot(`
      {
        "field": {
          "defaultValue": {
            "overrideDefault": false,
            "tags": [],
          },
          "formField": "tag",
          "label": "tags",
          "minTagLength": 1,
          "order": 999,
          "responsive": {
            "xs": 12,
          },
          "section": "website",
          "spaceReplacer": "_",
          "span": 12,
          "type": "tag",
        },
      }
    `);
  });

  it('should support section and layout properties', () => {
    class TestType {
      @TextField({
        label: 'description',
        section: 'website',
        order: 1,
        span: 6,
        offset: 2,
        responsive: { xs: 12, sm: 8 },
      })
      public field = 'hello';
    }

    expect(formBuilder(new TestType(), {})).toEqual({
      field: {
        label: 'description',
        defaultValue: 'hello',
        type: 'text',
        formField: 'input',
        section: 'website',
        order: 1,
        span: 6,
        offset: 2,
        responsive: { xs: 12, sm: 8 },
      },
    });
  });

  it('should support defaultFrom', () => {
    type TestType = { testBoolean: true };
    const test: TestType = { testBoolean: true };
    class BooleanType {
      @BooleanField<TestType>({
        label: 'description',
        defaultValue: false,
        defaultFrom: 'testBoolean',
      })
      public field: boolean;
    }

    expect(formBuilder(new BooleanType(), test)).toEqual({
      field: {
        label: 'description',
        defaultFrom: 'testBoolean',
        defaultValue: test.testBoolean,
        type: 'boolean',
        formField: 'checkbox',
        section: 'website',
        responsive: {
          xs: 12,
        },
        order: 999,
        span: 12,
      },
    });
  });
});

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
          description: [],
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
          description: [],
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

    expect(formBuilder(new TestType(), {})).toEqual({
      field: {
        defaultValue: {
          overrideDefault: false,
          tags: [],
        },
        formField: 'tag',
        label: 'tags',
        minTagLength: 1,
        order: 999,
        responsive: {
          xs: 12,
        },
        section: 'website',
        spaceReplacer: '_',
        span: 12,
        type: 'tag',
      },
    });
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

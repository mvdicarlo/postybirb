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
        row: Number.MAX_SAFE_INTEGER,
        col: 0,
      },
    });
  });

  it('should extend classes', () => {
    class BooleanType {
      @BooleanField({ label: 'description' })
      public field = false;
    }

    class ExtendedType extends BooleanType {
      @TextField({ label: 'description', col: 5 })
      public field2 = 'hello';

      @DescriptionField({ label: 'feature', descriptionType: 'html' })
      public field3;
    }

    class ExtendedAndOverrideType extends ExtendedType {
      @TextField({ label: 'title' })
      public field2 = 'Goodbye';

      @DescriptionField({ label: 'feature', descriptionType: 'markdown' })
      public field3;
    }

    expect(formBuilder(new BooleanType(), {})).toEqual({
      field: {
        label: 'description',
        defaultValue: false,
        type: 'boolean',
        formField: 'checkbox',
        row: Number.MAX_SAFE_INTEGER,
        col: 0,
      },
    });

    expect(formBuilder(new ExtendedType(), {})).toEqual({
      field: {
        label: 'description',
        defaultValue: false,
        type: 'boolean',
        formField: 'checkbox',
        row: Number.MAX_SAFE_INTEGER,
        col: 0,
      },
      field2: {
        label: 'description',
        defaultValue: 'hello',
        type: 'text',
        formField: 'input',
        row: Number.MAX_SAFE_INTEGER,
        col: 5,
      },
      field3: {
        col: 0,
        defaultValue: {
          description: [],
          overrideDefault: false,
        },
        descriptionType: 'html',
        formField: 'description',
        label: 'feature',
        row: 9007199254740991,
        type: 'description',
      },
    });

    expect(formBuilder(new ExtendedAndOverrideType(), {})).toEqual({
      field: {
        label: 'description',
        defaultValue: false,
        type: 'boolean',
        formField: 'checkbox',
        row: Number.MAX_SAFE_INTEGER,
        col: 0,
      },
      field2: {
        label: 'title',
        defaultValue: 'Goodbye',
        type: 'text',
        formField: 'input',
        row: Number.MAX_SAFE_INTEGER,
        col: 5,
      },
      field3: {
        col: 0,
        defaultValue: {
          description: [],
          overrideDefault: false,
        },
        descriptionType: 'markdown',
        formField: 'description',
        label: 'feature',
        row: 9007199254740991,
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
        row: Number.MAX_SAFE_INTEGER,
        col: 0,
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
    "col": 0,
    "defaultValue": {
      "overrideDefault": false,
      "tags": [],
    },
    "formField": "tag",
    "label": "tags",
    "row": 9007199254740991,
    "type": "tag",
  },
}
`);
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
        row: Number.MAX_SAFE_INTEGER,
        col: 0,
      },
    });
  });
});

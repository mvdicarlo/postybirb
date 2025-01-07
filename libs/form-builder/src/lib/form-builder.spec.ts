/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-classes-per-file */
import { BooleanField, TagField, TextField } from './decorators';
import { formBuilder } from './form-builder';

describe('formBuilder', () => {
  it('should build boolean types', () => {
    class BooleanType {
      @BooleanField({ label: 'description', defaultValue: false })
      public field: boolean;
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
      @BooleanField({ label: 'description', defaultValue: false })
      public field: boolean;
    }

    class ExtendedType extends BooleanType {
      @TextField({ label: 'description', defaultValue: 'Hello' })
      public field2: string;
    }

    class ExtendedAndOverrideType extends ExtendedType {
      @TextField({ label: 'title', defaultValue: 'Goodbye' })
      public field2: string;
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
        defaultValue: 'Hello',
        type: 'text',
        formField: 'input',
        row: Number.MAX_SAFE_INTEGER,
        col: 0,
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
        col: 0,
      },
    });
  });

  it('should build text types', () => {
    class TextType {
      @TextField({ label: 'description', defaultValue: 'Hello' })
      public field: string;
    }

    expect(formBuilder(new TextType(), {})).toEqual({
      field: {
        label: 'description',
        defaultValue: 'Hello',
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

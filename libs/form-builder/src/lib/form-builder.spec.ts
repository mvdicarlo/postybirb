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
        label: 'boolean field',
        defaultValue: false,
        type: 'boolean',
        formField: 'switch',
        row: Number.MAX_SAFE_INTEGER,
        col: Number.MAX_SAFE_INTEGER,
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
        label: 'text field',
        defaultValue: 'Hello',
        type: 'text',
        formField: 'input',
        row: Number.MAX_SAFE_INTEGER,
        col: Number.MAX_SAFE_INTEGER,
      },
    });
  });

  it('should build tag fields', () => {
    class TestType {
      @TagField({})
      field: string[];
    }

    expect(formBuilder(new TestType(), {})).toMatchInlineSnapshot();
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
        label: 'boolean field',
        defaultFrom: 'testBoolean',
        defaultValue: test.testBoolean,
        type: 'boolean',
        formField: 'switch',
        row: Number.MAX_SAFE_INTEGER,
        col: Number.MAX_SAFE_INTEGER,
      },
    });
  });
});

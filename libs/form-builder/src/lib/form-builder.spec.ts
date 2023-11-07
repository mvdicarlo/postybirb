/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-classes-per-file */
import { formBuilder } from './form-builder';
import { BooleanField, TextField } from './decorators';

describe('formBuilder', () => {
  it('should build boolean types', () => {
    class BooleanType {
      @BooleanField<any>({ label: 'boolean field', defaultValue: false })
      public field: boolean;
    }

    expect(formBuilder(new BooleanType(), {})).toEqual({
      field: [
        {
          label: 'boolean field',
          defaultValue: false,
          type: 'boolean',
          formField: 'switch',
          row: 1000,
          column: 0,
        },
      ],
    });
  });

  it('should build text types', () => {
    class TextType {
      @TextField<any>({ label: 'text field', defaultValue: 'Hello' })
      public field: string;
    }

    expect(formBuilder(new TextType(), {})).toEqual({
      field: [
        {
          label: 'text field',
          defaultValue: 'Hello',
          type: 'text',
          formField: 'input',
          row: 1000,
          column: 0,
        },
      ],
    });
  });

  it('should support defaultFrom', () => {
    type TestType = { testBoolean: true };
    const test: TestType = { testBoolean: true };
    class BooleanType {
      @BooleanField<TestType>({
        label: 'boolean field',
        defaultValue: false,
        defaultFrom: 'testBoolean',
      })
      public field: boolean;
    }

    expect(formBuilder(new BooleanType(), test)).toEqual({
      field: [
        {
          label: 'boolean field',
          defaultFrom: 'testBoolean',
          defaultValue: test.testBoolean,
          type: 'boolean',
          formField: 'switch',
          row: 1000,
          column: 0,
        },
      ],
    });
  });
});

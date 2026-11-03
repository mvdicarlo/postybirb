import {
  BooleanField,
  DateTimeField,
  DescriptionField,
  FieldAggregateType,
  formBuilder,
  NumberField,
  RadioField,
  RatingField,
  SelectFieldType,
  SelectOption,
  TagField,
  TextField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  SubmissionRating,
} from '@postybirb/types';
import { Window } from 'happy-dom';
import * as React from 'react';
import { act, createElement } from 'react';
import type { Root } from 'react-dom/client';

let createRoot: typeof import('react-dom/client').createRoot;
let MantineProvider: typeof import('@mantine/core').MantineProvider;
let FormField: typeof import('./form-field').FormField;
let mockValues: Record<string, unknown>;
let mockArchived = false;
const mockSetValue = jest.fn();
const mockDefaultOption = {
  isDefault: true,
  data: { rating: SubmissionRating.GENERAL },
};
const mockOption = { data: {}, isDefault: false };
const controlSelector = 'input:not([type="hidden"]), button[role="combobox"]';

jest.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: React.PropsWithChildren) => children,
  useLingui: () => ({ t: (strings: TemplateStringsArray) => strings.join('') }),
}));
jest.mock('./form-fields-context', () => ({
  useFormFieldsContext: () => ({
    getValue: (name: string) => mockValues[name],
    setValue: mockSetValue,
    option: mockOption,
    submission: {
      isArchived: mockArchived,
      isMultiSubmission: false,
      isTemplate: false,
      files: [],
      options: [mockDefaultOption, mockOption],
    },
  }),
}));
jest.mock('./hooks/use-validations', () => ({
  useValidations: () => ({ errors: [], warnings: [], isInvalid: false }),
}));
jest.mock('./fields/field-label', () => ({
  FieldLabel: ({ children }: React.PropsWithChildren) => children,
  getTranslatedLabel: (field: FieldAggregateType) =>
    typeof field.label === 'string' ? field.label : field.label.untranslated,
}));
jest.mock('../../../../../../stores', () => ({
  useAccount: () => undefined,
  useNonEmptyTagGroups: () => [],
  useSettings: () => undefined,
  useTagConverters: () => [],
}));
jest.mock('../../../../../../stores/entity/user-converter-store', () => ({
  useUserConverters: () => [],
}));
jest.mock('../../../../../../hooks', () => ({
  useTagSearch: () => ({
    data: [],
    searchValue: '',
    onSearchChange: jest.fn(),
  }),
}));
jest.mock('../../../../../shared', () => ({
  DateTimePickerWithLocalization: ({ disabled }: { disabled: boolean }) =>
    React.createElement('input', { disabled }),
  DescriptionEditor: ({ readOnly }: { readOnly: boolean }) =>
    React.createElement('textarea', { readOnly }),
}));
jest.mock('./fields/description-preview-panel', () => ({
  DescriptionPreviewPanel: () => null,
}));
jest.mock('./fields/field.css', () => ({}));

const tierOptions: SelectOption[] = [
  { value: 'supporters', label: 'Supporters' },
];
const tierField: SelectFieldType = {
  formField: 'select',
  label: 'accessTiers',
  allowMultiple: true,
  options: tierOptions,
  enableWhen: [['visibility', ['tiers']]],
};

const purchaseConditions: NonNullable<FieldAggregateType['enableWhen']> = [
  ['isPurchasable', [true]],
];

class ConditionalFields {
  @BooleanField({ label: 'allowPurchases', enableWhen: purchaseConditions })
  checkbox = false;

  @TextField({ label: 'title', enableWhen: purchaseConditions })
  input = '';

  @TextField({
    label: 'title',
    formField: 'textarea',
    enableWhen: purchaseConditions,
  })
  textarea = '';

  @TitleField({ enableWhen: purchaseConditions })
  title = '';

  @NumberField({
    label: 'priceCredits',
    min: 3,
    max: 300,
    enableWhen: purchaseConditions,
  })
  price = 3;

  @DateTimeField({ label: 'title', enableWhen: purchaseConditions })
  datetime = '';

  @RadioField({
    label: 'visibility',
    options: [{ value: 'one', label: 'First' }],
    enableWhen: purchaseConditions,
  })
  radio = 'one';

  @RatingField({ enableWhen: purchaseConditions })
  rating = SubmissionRating.GENERAL;

  @TagField({ enableWhen: purchaseConditions })
  tags = DefaultTagValue();

  @DescriptionField({ enableWhen: purchaseConditions })
  description = { ...DefaultDescriptionValue(), overrideDefault: true };
}

const conditionalFields = formBuilder(new ConditionalFields(), {});

describe('FormField conditional availability', () => {
  let browser: Window;
  let container: HTMLDivElement;
  let root: Root;
  const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

  beforeAll(async () => {
    browser = new Window({ url: 'http://localhost' });
    const globals: Record<string, unknown> = {
      window: browser,
      document: browser.document,
      Document: browser.Document,
      navigator: browser.navigator,
      HTMLElement: browser.HTMLElement,
      HTMLInputElement: browser.HTMLInputElement,
      HTMLTextAreaElement: browser.HTMLTextAreaElement,
      Element: browser.Element,
      Node: browser.Node,
      ShadowRoot: browser.ShadowRoot,
      ResizeObserver: browser.ResizeObserver,
      MutationObserver: browser.MutationObserver,
      getComputedStyle: browser.getComputedStyle.bind(browser),
      requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
      cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
      IS_REACT_ACT_ENVIRONMENT: true,
      React,
    };
    Object.entries(globals).forEach(([key, value]) => {
      originalGlobals.set(
        key,
        Object.getOwnPropertyDescriptor(globalThis, key),
      );
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value,
      });
    });
    ({ createRoot } = await import('react-dom/client'));
    ({ MantineProvider } = await import('@mantine/core'));
    ({ FormField } = await import('./form-field'));
  });

  beforeEach(() => {
    mockValues = { visibility: 'subscribers', tiers: ['supporters'] };
    mockArchived = false;
    mockSetValue.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  afterAll(async () => {
    await browser.happyDOM.close();
    originalGlobals.forEach((descriptor, key) => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  });

  function renderField(
    field: FieldAggregateType = tierField,
    fieldName = 'tiers',
  ) {
    act(() =>
      root.render(
        createElement(
          MantineProvider,
          { env: 'test' },
          createElement(FormField, { fieldName, field }),
        ),
      ),
    );
  }

  function getControl() {
    const control = container.querySelector<
      HTMLInputElement | HTMLButtonElement
    >(controlSelector);
    if (!control) throw new Error('Expected a visible select control');
    return control;
  }

  function expectEditingDisabled(disabled: boolean) {
    const controls = container.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement
    >('input:not([type="hidden"]), textarea');
    expect(controls.length).toBeGreaterThan(0);
    controls.forEach((control) => {
      expect(control.disabled || control.readOnly).toBe(disabled);
    });
  }

  describe.each(Object.entries(conditionalFields))(
    '%s field',
    (fieldName, field) => {
      it.each([false, true, undefined])(
        'stays visible and enables editing only when conditions match (%s)',
        (isPurchasable) => {
          mockValues.isPurchasable = isPurchasable;
          renderField(field, fieldName);
          expectEditingDisabled(isPurchasable !== true);
        },
      );

      it('keeps archived submissions read-only when conditions match', () => {
        mockValues.isPurchasable = true;
        mockArchived = true;
        renderField(field, fieldName);
        expectEditingDisabled(true);
      });

      it('preserves normal editing without enableWhen', () => {
        renderField({ ...field, enableWhen: undefined }, fieldName);
        expectEditingDisabled(false);
      });
    },
  );

  it('preserves the price when purchases are enabled and disabled', () => {
    mockValues.price = 25;
    for (const isPurchasable of [false, true, false]) {
      mockValues.isPurchasable = isPurchasable;
      renderField(conditionalFields.price, 'price');
      expectEditingDisabled(!isPurchasable);
      expect(container.querySelector('input')?.value).toBe('25');
    }
    expect(mockSetValue).not.toHaveBeenCalled();
  });

  it('preserves additional description restrictions when enabled', () => {
    mockValues.isPurchasable = true;
    mockValues.description = {
      ...DefaultDescriptionValue(),
      overrideDefault: true,
      description: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'titleShortcut' }] }],
      },
    };
    renderField(conditionalFields.description, 'description');
    const checkboxes = container.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].disabled).toBe(true);
    expect(checkboxes[1].disabled).toBe(false);
    expect(container.querySelector('textarea')?.readOnly).toBe(false);
  });

  describe.each([
    { name: 'multi-select', allowMultiple: true, options: tierOptions },
    { name: 'single-select', allowMultiple: false, options: tierOptions },
    {
      name: 'tree select',
      allowMultiple: true,
      options: [{ label: 'Creator tiers', items: tierOptions }],
    },
  ])('$name', ({ allowMultiple, options }) => {
    beforeEach(() => {
      mockValues.tiers = allowMultiple ? ['supporters'] : 'supporters';
    });

    it.each(['all', 'subscribers', 'tiers'])(
      'stays visible and is enabled only for tiers visibility (%s)',
      (visibility) => {
        mockValues.visibility = visibility;
        renderField({ ...tierField, allowMultiple, options });
        expect(getControl().disabled).toBe(visibility !== 'tiers');
      },
    );

    it('keeps archived submissions disabled even when conditions match', () => {
      mockValues.visibility = 'tiers';
      mockArchived = true;
      renderField({ ...tierField, allowMultiple, options });
      expect(getControl().disabled).toBe(true);
    });

    it('preserves normal selects without enableWhen', () => {
      renderField({
        ...tierField,
        allowMultiple,
        options,
        enableWhen: undefined,
      });
      expect(getControl().disabled).toBe(false);
    });
  });

  it('preserves selected tiers when visibility changes', () => {
    mockValues.visibility = 'tiers';
    renderField();
    expect(getControl().disabled).toBe(false);
    expect(container.textContent).toContain('Supporters');

    mockValues.visibility = 'all';
    renderField();
    expect(getControl().disabled).toBe(true);
    expect(container.textContent).toContain('Supporters');

    mockValues.visibility = 'tiers';
    renderField();
    expect(getControl().disabled).toBe(false);
    expect(container.textContent).toContain('Supporters');
    expect(mockSetValue).not.toHaveBeenCalled();
  });

  it('disables the select when its controlling value is missing', () => {
    delete mockValues.visibility;
    renderField();
    expect(getControl().disabled).toBe(true);
  });

  it('requires every enableWhen condition to match', () => {
    const field: SelectFieldType = {
      ...tierField,
      enableWhen: [
        ['visibility', ['tiers']],
        ['isPurchasable', [true]],
      ],
    };
    mockValues.visibility = 'tiers';
    mockValues.isPurchasable = false;
    renderField(field);
    expect(getControl().disabled).toBe(true);

    mockValues.isPurchasable = true;
    renderField(field);
    expect(getControl().disabled).toBe(false);
  });

  it('preserves showWhen overriding hidden without overriding enableWhen', () => {
    const field: SelectFieldType = {
      ...tierField,
      hidden: true,
      showWhen: [['isPurchasable', [true]]],
    };
    mockValues.isPurchasable = false;
    renderField(field);
    expect(container.querySelector(controlSelector)).toBeNull();

    mockValues.isPurchasable = true;
    renderField(field);
    expect(getControl().disabled).toBe(true);
  });

  it('preserves rating fallback to the default options in conditions', () => {
    renderField({
      ...tierField,
      enableWhen: [['rating', [SubmissionRating.GENERAL]]],
    });
    expect(getControl().disabled).toBe(false);
  });
});

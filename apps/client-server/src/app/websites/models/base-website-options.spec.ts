// eslint-disable-next-line max-classes-per-file
import { TagField, TextField } from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  Description,
  SubmissionRating,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from './base-website-options';
import { DefaultWebsiteOptions } from './default-website-options';

describe('BaseWebsiteOptions', () => {
  const defaultDescriptionValue: Description = [
    {
      id: 'test-basic-text',
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [
        { type: 'text', text: 'Hello, ', styles: { bold: true } },
        { type: 'text', text: 'World!', styles: {} },
      ],
      children: [],
    },
  ];

  it('should create an instance with default values', () => {
    const options = new BaseWebsiteOptions();
    expect(options.title).toBe('');
    expect(options.tags).toEqual(DefaultTagValue());
    expect(options.description).toEqual(DefaultDescriptionValue());
    expect(options.rating).toBeUndefined();
  });

  it('should create form fields with correct default values', () => {
    const options = new BaseWebsiteOptions();
    const formFields = options.getFormFields();
    expect(formFields).toBeDefined();
    expect(formFields.title.defaultValue).toBe('');
    expect(formFields.tags.defaultValue).toEqual(DefaultTagValue());
    expect(formFields.description.defaultValue).toEqual(
      DefaultDescriptionValue(),
    );
    expect(formFields.rating.defaultValue).toBeUndefined();
  });

  it('should properly generate form fields for extended classes', () => {
    class ExtendedWebsiteOptions extends BaseWebsiteOptions {
      @TextField({ label: 'feature' })
      customField = '';
    }

    const options = new ExtendedWebsiteOptions();
    const formFields = options.getFormFields();
    expect(formFields).toBeDefined();
    expect(formFields.customField).toBeDefined();
  });

  it('should create an instance with provided values', () => {
    const options = new BaseWebsiteOptions({
      title: 'Test Title',
      tags: { overrideDefault: true, tags: ['tag1', 'tag2'] },
      description: {
        overrideDefault: true,
        description: [...defaultDescriptionValue],
        insertTitle: true,
        insertTags: true,
      },
      rating: SubmissionRating.GENERAL,
    });
    expect(options.title).toBe('Test Title');
    expect(options.tags).toEqual({
      overrideDefault: true,
      tags: ['tag1', 'tag2'],
    });
    expect(options.description).toEqual({
      overrideDefault: true,
      description: defaultDescriptionValue,
      insertTitle: true,
      insertTags: true,
    });
    expect(options.rating).toBe(SubmissionRating.GENERAL);
  });

  it('should merge defaults correctly', () => {
    const defaultOptions = new DefaultWebsiteOptions({
      title: 'Default Title',
      tags: { overrideDefault: false, tags: ['defaultTag'] },
      description: {
        overrideDefault: false,
        description: [],
        insertTitle: false,
        insertTags: false,
      },
      rating: SubmissionRating.MATURE,
    });

    const options = new BaseWebsiteOptions({
      title: 'New Title',
      tags: { overrideDefault: true, tags: ['newTag'] },
      description: {
        overrideDefault: true,
        description: [...defaultDescriptionValue],
        insertTitle: true,
        insertTags: true,
      },
      rating: SubmissionRating.ADULT,
    });

    const mergedOptions = options.mergeDefaults(defaultOptions);

    expect(mergedOptions.title).toBe('New Title');
    expect(mergedOptions.tags).toEqual({
      overrideDefault: true,
      tags: ['newTag'],
    });
    expect(mergedOptions.description).toEqual({
      overrideDefault: true,
      description: defaultDescriptionValue,
      insertTitle: true,
      insertTags: true,
    });
    expect(mergedOptions.rating).toBe(SubmissionRating.ADULT);
  });

  it('should get form fields', () => {
    const options = new BaseWebsiteOptions();
    const formFields = options.getFormFields();
    expect(formFields).toBeDefined();
  });

  it('should process tags correctly', async () => {
    class ExtendedWebsiteOptions extends BaseWebsiteOptions {
      @TagField({
        maxTagLength: 5,
        minTagLength: 2,
        maxTags: 3,
      })
      tags: TagValue;

      protected processTag(tag: string): string {
        return super.processTag(tag).toUpperCase();
      }
    }
    const options = new ExtendedWebsiteOptions({
      tags: {
        overrideDefault: true,
        tags: ['tag1', 'tag2', 'a', 'tag3', 'tag3', 'long-tag'],
      },
    });
    expect(await options.getProcessedTags()).toEqual(['TAG1', 'TAG2', 'TAG3']);
  });
});

import { isZodDto } from './zod-dto';
import * as Types from '../index';

jest.mock('@nestjs/common', () => {
  throw new Error('Shared DTOs must not load Nest in the browser');
});

const settings = {
  hiddenWebsites: [],
  allowAd: true,
  queuePaused: false,
  desktopNotifications: {
    enabled: true,
    showOnPostSuccess: true,
    showOnPostError: true,
    showOnDirectoryWatcherError: true,
    showOnDirectoryWatcherSuccess: true,
  },
  tagSearchProvider: { showWikiInHelpOnHover: true },
};

const websiteOptions = {
  accountId: 'account',
  submissionId: 'submission',
  data: { title: 'Title', websiteSpecific: { folder: 'folder' } },
};
const description = { type: 'doc', content: [] };
const formRequest = {
  accountId: 'account',
  type: Types.SubmissionType.FILE,
};
const templateOptions = {
  targetSubmissionIds: ['submission'],
  options: [{ accountId: 'account', data: { title: 'Title' } }],
  overrideTitle: true,
  overrideDescription: false,
};
const importRequest = {
  customShortcuts: true,
  tagGroups: true,
  accounts: true,
  tagConverters: true,
  submissions: true,
  templates: true,
};
const previewRequest = {
  submissionId: 'submission',
  websiteOptionId: 'option',
};

const cases: Array<{
  dto: { name: string; create: (value: unknown) => unknown };
  valid: unknown;
  invalid: unknown;
}> = [
  {
    dto: Types.CreateAccountDto,
    valid: { name: 'Account', website: 'website', groups: [] },
    invalid: { name: '', website: 'website', groups: [] },
  },
  {
    dto: Types.UpdateAccountDto,
    valid: { name: 'Account', groups: [], defaultFileTemplateId: null },
    invalid: { name: 'Account', groups: [1] },
  },
  {
    dto: Types.SetWebsiteDataRequestDto,
    valid: { id: 'account', data: { token: 'value' } },
    invalid: { id: 'account', data: [] },
  },
  {
    dto: Types.CreateCustomShortcutDto,
    valid: { name: 'Shortcut' },
    invalid: { name: 1 },
  },
  {
    dto: Types.UpdateCustomShortcutDto,
    valid: { name: 'Shortcut', shortcut: description },
    invalid: { name: 'Shortcut', shortcut: { type: 'doc', content: [1] } },
  },
  {
    dto: Types.CheckPathDto,
    valid: { path: '/directory' },
    invalid: { path: '' },
  },
  {
    dto: Types.CreateDirectoryWatcherDto,
    valid: { importAction: Types.DirectoryWatcherImportAction.NEW_SUBMISSION },
    invalid: { importAction: 'invalid' },
  },
  {
    dto: Types.UpdateDirectoryWatcherDto,
    valid: { templateId: null },
    invalid: { path: 1 },
  },
  {
    dto: Types.FormGenerationRequestDto,
    valid: formRequest,
    invalid: { ...formRequest, type: 'invalid' },
  },
  {
    dto: Types.LegacyImportDto,
    valid: importRequest,
    invalid: { ...importRequest, accounts: 'true' },
  },
  {
    dto: Types.CreateNotificationDto,
    valid: { title: 'Title', message: 'Message' },
    invalid: { title: 'Title', message: 'Message', type: 'invalid' },
  },
  {
    dto: Types.UpdateNotificationDto,
    valid: { isRead: true, hasEmitted: false },
    invalid: { isRead: 'true', hasEmitted: false },
  },
  {
    dto: Types.GetIncompleteWorkDto,
    valid: {
      submissionId: 'submission',
      evictions: {},
      targets: { account: [] },
    },
    invalid: { submissionId: 'submission', evictions: { account: [1] } },
  },
  {
    dto: Types.UpdateCookiesRemoteDto,
    valid: {
      accountId: 'account',
      cookies: '',
      localStorage: { url: 'https://example.com', data: { token: 'value' } },
    },
    invalid: {
      accountId: 'account',
      cookies: '',
      localStorage: { url: 1, data: {} },
    },
  },
  {
    dto: Types.UpdateSettingsDto,
    valid: { settings },
    invalid: { settings: { ...settings, desktopNotifications: [] } },
  },
  {
    dto: Types.UpdateStartupSettingsDto,
    valid: { spellchecker: false },
    invalid: { port: 9487 },
  },
  {
    dto: Types.ApplyMultiSubmissionDto,
    valid: { submissionToApply: 'submission', submissionIds: [], merge: true },
    invalid: { submissionToApply: '', submissionIds: [], merge: true },
  },
  {
    dto: Types.ApplyTemplateOptionsDto,
    valid: templateOptions,
    invalid: { ...templateOptions, options: [{ accountId: '', data: {} }] },
  },
  {
    dto: Types.CreateSubmissionDto,
    valid: { type: Types.SubmissionType.FILE },
    invalid: { isTemplate: 'not-a-boolean' },
  },
  {
    dto: Types.ReorderSubmissionFilesDto,
    valid: { order: { file: 1.5 } },
    invalid: { order: { file: '1' } },
  },
  {
    dto: Types.ReorderSubmissionDto,
    valid: { id: 'submission', targetId: 'target', position: 'after' },
    invalid: { id: 'submission', targetId: 'target', position: 'invalid' },
  },
  {
    dto: Types.TemplateOptionDto,
    valid: { accountId: 'account', data: {} },
    invalid: {
      accountId: 'account',
      data: { tags: { overrideDefault: false, tags: [1] } },
    },
  },
  {
    dto: Types.UpdateAltFileDto,
    valid: { text: 'Alt text' },
    invalid: { text: null },
  },
  {
    dto: Types.UpdateSubmissionDto,
    valid: { isArchived: true, scheduledFor: '2026-10-21T12:00:00Z' },
    invalid: { scheduledFor: 'not-a-date' },
  },
  {
    dto: Types.UpdateSubmissionTemplateNameDto,
    valid: { name: 'Template' },
    invalid: { name: false },
  },
  {
    dto: Types.CreateTagConverterDto,
    valid: { tag: 'tag', convertTo: { website: 'converted' } },
    invalid: { tag: 'tag', convertTo: { website: 1 } },
  },
  {
    dto: Types.UpdateTagConverterDto,
    valid: { tag: 'tag', convertTo: {} },
    invalid: { convertTo: {} },
  },
  {
    dto: Types.CreateTagGroupDto,
    valid: { name: 'Group', tags: [] },
    invalid: { name: 'Group', tags: [1] },
  },
  {
    dto: Types.UpdateTagGroupDto,
    valid: { name: 'Group', tags: [] },
    invalid: { tags: [] },
  },
  {
    dto: Types.CreateUserConverterDto,
    valid: { username: 'User', convertTo: {} },
    invalid: { username: 'User', convertTo: [] },
  },
  {
    dto: Types.UpdateUserConverterDto,
    valid: { convertTo: {} },
    invalid: { convertTo: { website: false } },
  },
  {
    dto: Types.CreateWebsiteOptionsDto,
    valid: websiteOptions,
    invalid: { ...websiteOptions, data: [] },
  },
  {
    dto: Types.UpdateWebsiteOptionsDto,
    valid: { data: websiteOptions.data },
    invalid: { data: { title: 1 } },
  },
  {
    dto: Types.UpdateSubmissionWebsiteOptionsDto,
    valid: { remove: ['option'], add: [websiteOptions] },
    invalid: { add: [{ ...websiteOptions, accountId: 1 }] },
  },
  {
    dto: Types.PreviewDescriptionDto,
    valid: previewRequest,
    invalid: { submissionId: 'submission' },
  },
  {
    dto: Types.ValidateWebsiteOptionsDto,
    valid: previewRequest,
    invalid: { websiteOptionId: 'option' },
  },
  {
    dto: Types.OAuthWebsiteRequestDto,
    valid: { id: 'account', route: 'login', data: {} },
    invalid: { id: 'account', route: 'login', data: null },
  },
  {
    dto: Types.CustomWebsiteRouteDto,
    valid: { id: 'website', route: 'route', data: 'value' },
    invalid: { id: 1, route: 'route' },
  },
  {
    dto: Types.PostQueueActionDto,
    valid: { submissionIds: [] },
    invalid: { submissionIds: [1] },
  },
  {
    dto: Types.QueuePostRecordRequestDto,
    valid: { ids: [] },
    invalid: { ids: [1] },
  },
];

describe('shared request DTOs', () => {
  it('exposes schemas without property decorators or framework metadata', () => {
    expect(Types.CreateAccountDto.schema).toBe(Types.CreateAccountSchema);
    expect(Types.isZodDto(Types.CreateAccountDto)).toBe(true);
    expect(Types.isZodDto(undefined)).toBe(false);
    expect(Types.isZodDto(Object)).toBe(false);
    expect(Types.isZodDto({ schema: Types.CreateAccountSchema })).toBe(false);
  });

  it('covers every exported runtime DTO without loading Nest', () => {
    const dtoNames = Object.values(Types)
      .filter((value) => typeof value === 'function')
      .filter(isZodDto)
      .map((dto) => dto.name);
    expect(dtoNames.sort()).toEqual(cases.map(({ dto }) => dto.name).sort());
  });

  describe.each(cases)('$dto.name', ({ dto, valid, invalid }) => {
    it('parses a valid request', () => {
      expect(() => dto.create(valid)).not.toThrow();
    });

    it('rejects an invalid request', () => {
      expect(() => dto.create(invalid)).toThrow();
    });

    it('rejects non-object request bodies', () => {
      for (const value of [null, undefined, [], '', 1, true]) {
        expect(() => dto.create(value)).toThrow();
      }
    });
  });

  it('enforces account name length', () => {
    expect(
      Types.CreateAccountSchema.safeParse({
        name: 'a'.repeat(64),
        website: 'website',
        groups: [],
      }).success,
    ).toBe(true);
    expect(
      Types.CreateAccountSchema.safeParse({
        name: 'a'.repeat(65),
        website: 'website',
        groups: [],
      }).success,
    ).toBe(false);
  });

  it('preserves notification defaults and website-specific option fields', () => {
    expect(
      Types.CreateNotificationDto.create({
        title: 'Title',
        message: 'Message',
      }),
    ).toEqual({
      title: 'Title',
      message: 'Message',
      data: {},
      tags: [],
      type: 'info',
    });
    expect(Types.CreateWebsiteOptionsDto.create(websiteOptions).data).toEqual(
      websiteOptions.data,
    );
    expect(
      Types.CreateWebsiteOptionsDto.create({
        accountId: 'account',
        submissionId: 'submission',
      }),
    ).toEqual({
      accountId: 'account',
      submissionId: 'submission',
      data: {},
      isDefault: false,
    });
  });

  it('does not apply create defaults when partially updating directory watchers', () => {
    expect(
      Types.UpdateDirectoryWatcherDto.create({ templateId: null }),
    ).toEqual({
      templateId: null,
    });
  });

  it('preserves legacy constructor defaults for internal callers', () => {
    expect(new Types.CreateNotificationDto()).toMatchObject({
      data: {},
      tags: [],
      type: 'info',
    });
    expect(new Types.CreateWebsiteOptionsDto().isDefault).toBe(false);
    expect(new Types.CreateNotificationDto().tags).not.toBe(
      new Types.CreateNotificationDto().tags,
    );
    expect(new Types.CreateNotificationDto().data).not.toBe(
      new Types.CreateNotificationDto().data,
    );
  });

  it('preserves extensible TipTap node attributes and content', () => {
    const document = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello',
              marks: [{ type: 'link', attrs: { href: '/link' } }],
            },
          ],
        },
        {
          type: 'customShortcut',
          attrs: { id: 'shortcut', custom: { key: 'value' } },
        },
      ],
    };
    expect(Types.DescriptionSchema.parse(document)).toEqual(document);
  });
});

describe('submission requests', () => {
  const dependsOn = ['f13b5b00-47a6-4cca-9d9d-b4301a846bf6'];
  const defaultOptions = {
    tags: ['tag'],
    rating: Types.SubmissionRating.GENERAL,
    description: { overrideDefault: false, description },
  };
  const fileMetadata = [{ filename: 'image.png', title: 'Image' }];

  it('parses JSON and multipart payloads to the same result', () => {
    const json = {
      type: Types.SubmissionType.FILE,
      isTemplate: false,
      isMultiSubmission: true,
      dependsOn,
      defaultOptions,
      fileMetadata,
    };
    const multipart = {
      ...json,
      isTemplate: 'false',
      isMultiSubmission: 'true',
      dependsOn: JSON.stringify(dependsOn),
      defaultOptions: JSON.stringify(defaultOptions),
      fileMetadata: JSON.stringify(fileMetadata),
    };
    expect(Types.CreateSubmissionDto.create(multipart)).toEqual(
      Types.CreateSubmissionDto.create(json),
    );
  });

  it.each(['dependsOn', 'defaultOptions', 'fileMetadata'])(
    'rejects malformed JSON in %s',
    (field) => {
      expect(() =>
        Types.CreateSubmissionDto.create({ [field]: '{invalid' }),
      ).toThrow('Invalid JSON');
    },
  );

  it.each([
    { dependsOn: ['not-a-uuid'] },
    { dependsOn: JSON.stringify(['not-a-uuid']) },
    { defaultOptions: { tags: [1] } },
    { defaultOptions: { rating: 'invalid' } },
    { fileMetadata: [{ filename: 'file' }] },
    { fileMetadata: JSON.stringify([{ filename: 'file' }]) },
    { isTemplate: true },
    { isTemplate: 'true', name: ' ' },
    { isTemplate: 1 },
    { isMultiSubmission: 'yes' },
  ])('rejects invalid nested fields: %j', (payload) => {
    expect(() => Types.CreateSubmissionDto.create(payload)).toThrow();
  });

  it('accepts omitted or empty multipart JSON fields', () => {
    expect(
      Types.CreateSubmissionDto.create({
        dependsOn: '',
        defaultOptions: '',
        fileMetadata: '',
      }),
    ).toEqual({ name: '' });
  });

  it('rejects invalid nested website options on submission updates', () => {
    expect(() =>
      Types.UpdateSubmissionDto.create({
        newOrUpdatedOptions: [
          { id: 'option', accountId: 'account', data: { rating: 'invalid' } },
        ],
      }),
    ).toThrow();
  });

  it('preserves nullable template selection and partial updates', () => {
    expect(
      Types.UpdateAccountDto.create({
        name: 'Account',
        groups: [],
        defaultFileTemplateId: null,
        defaultMessageTemplateId: null,
      }),
    ).toMatchObject({
      defaultFileTemplateId: null,
      defaultMessageTemplateId: null,
    });
    expect(Types.UpdateSubmissionDto.create({})).toEqual({});
    expect(Types.UpdateUserConverterDto.create({})).toEqual({});
    expect(Types.UpdateStartupSettingsDto.create({})).toEqual({});
  });
});

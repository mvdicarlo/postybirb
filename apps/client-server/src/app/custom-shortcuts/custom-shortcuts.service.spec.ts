import {
    DefaultDescriptionValue,
    Description,
    DescriptionValue,
} from '@postybirb/types';
import { PostyBirbService } from '../common/service/postybirb-service';
import { WebsiteOptionsService } from '../website-options/website-options.service';
import { CustomShortcutsService } from './custom-shortcuts.service';

describe('CustomShortcutsService', () => {
  let service: CustomShortcutsService;
  let websiteOptionsService: jest.Mocked<WebsiteOptionsService>;

  beforeEach(() => {
    websiteOptionsService = {
      findAll: jest.fn(),
      update: jest.fn(),
      // ...unused methods mocked to satisfy type system if referenced indirectly
    } as unknown as jest.Mocked<WebsiteOptionsService>;

    service = new CustomShortcutsService(websiteOptionsService);

    // Mock repository on the base class used by remove()
    (service as unknown as { repository: any }).repository = {
      findById: jest.fn().mockResolvedValue({ id: 'to-delete' }),
    };

    // Avoid hitting real base remove logic
    jest
      .spyOn(PostyBirbService.prototype as any, 'remove')
      .mockResolvedValue(undefined as unknown as void);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  function makeDesc(blocks: any[]): DescriptionValue {
    const dv = DefaultDescriptionValue();
    dv.description = blocks as any;
    return dv;
  }

  it('filters customShortcut inline nodes by id and updates changed options', async () => {
    const blocksWithShortcut = [
      {
        id: 'p1',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [
          { type: 'text', text: 'Hello ', styles: {} },
          { type: 'customShortcut', props: { id: 'to-delete' } },
          { type: 'text', text: 'World', styles: {} },
        ],
      },
    ];

    const blocksWithoutShortcut = [
      {
        id: 'p2',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [{ type: 'text', text: 'No shortcut here', styles: {} }],
      },
    ];

    websiteOptionsService.findAll.mockResolvedValue([
      {
        id: 'opt-1',
        data: { description: makeDesc(blocksWithShortcut) },
      } as any,
      {
        id: 'opt-2',
        data: { description: makeDesc(blocksWithoutShortcut) },
      } as any,
    ]);

    await service.remove('to-delete');

    // Should update only the first option where change occurred
    expect(websiteOptionsService.update).toHaveBeenCalledTimes(1);
    expect(websiteOptionsService.update).toHaveBeenCalledWith(
      'opt-1',
      expect.objectContaining({
        data: expect.objectContaining({
          description: expect.objectContaining({
            description: [
              expect.objectContaining({
                content: [
                  expect.objectContaining({ type: 'text', text: 'Hello ' }),
                  // customShortcut removed
                  expect.objectContaining({ type: 'text', text: 'World' }),
                ],
              }),
            ],
          }),
        }),
      }),
    );
  });

  it('does not update when description is empty or absent', async () => {
    websiteOptionsService.findAll.mockResolvedValue([
      { id: 'opt-empty', data: { description: makeDesc([]) } } as any,
      { id: 'opt-none', data: {} } as any,
    ]);

    await service.remove('any');

    expect(websiteOptionsService.update).not.toHaveBeenCalled();
  });

  it('filters nested inline content and children blocks', async () => {
    const nestedBlocks: Description = [
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
          {
            type: 'customShortcut',
            props: {
              id: 'to-delete',
            },
            content: [
              {
                type: 'text',
                text: 'User',
                styles: {},
              },
            ],
          },
        ],
        children: [],
      },
    ];

    const { changed, filtered } = service.filterCustomShortcut(
      nestedBlocks,
      'to-delete',
    );
    expect(changed).toBeTruthy();
    expect(filtered).toEqual([
      {
        id: 'test-basic-text',
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [{ type: 'text', text: 'Hello, ', styles: { bold: true } }],
        children: [],
      },
    ]);
  });
});

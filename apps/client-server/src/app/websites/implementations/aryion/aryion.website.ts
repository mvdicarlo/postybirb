import { SelectOption } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
  FileType,
  ILoginState,
  ImageResizeProps,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { HTMLElement, parse } from 'node-html-parser';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { SelectOptionUtil } from '../../../utils/select-option.util';
import { PostBuilder } from '../../commons/post-builder';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { AryionAccountData } from './models/aryion-account-data';
import { AryionFileSubmission } from './models/aryion-file-submission';

@WebsiteMetadata({
  name: 'aryion',
  displayName: 'Aryion',
})
@UserLoginFlow('https://aryion.com/forum/ucp.php?mode=login')
@SupportsFiles({
  acceptedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/x-shockwave-flash',
    'application/vnd.visio',
    'text/plain',
    'application/rtf',
    'video/x-msvideo',
    'video/mpeg',
    'video/x-flv',
    'video/mp4',
    'application/pdf',
  ],
  acceptedFileSizes: {
    [FileType.IMAGE]: FileSize.megabytes(20),
    [FileType.VIDEO]: FileSize.megabytes(100),
    [FileType.TEXT]: FileSize.megabytes(100),
    'application/pdf': FileSize.megabytes(100),
  },
})
export default class Aryion
  extends Website<AryionAccountData>
  implements FileWebsite<AryionFileSubmission>
{
  protected BASE_URL = 'https://aryion.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<AryionAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const res = await Http.get<string>(`${this.BASE_URL}/g4/treeview.php`, {
      partition: this.accountId,
    });

    if (
      res.body.includes('user-link') &&
      !res.body.includes('Login to read messages')
    ) {
      const $ = parse(res.body);
      const userLink = $.querySelector('.user-link');
      const username = userLink ? userLink.text : 'Unknown User';
      this.loginState.setLogin(true, username);
      await this.getFolders($);
    } else {
      this.loginState.logout();
    }

    return this.loginState.getState();
  }

  private async getFolders($: HTMLElement): Promise<void> {
    const folders: SelectOption[] = [];
    const treeviews = $.querySelectorAll('.treeview');

    treeviews.forEach((treeview) => {
      // Process each top-level <li> element
      const topLevelItems = treeview.querySelectorAll(':scope > li');
      topLevelItems.forEach((li) => {
        this.parseFolderItem(li, folders);
      });
    });

    this.websiteDataStore.setData({
      ...this.websiteDataStore.getData(),
      folders,
    });
  }

  private parseFolderItem(li: HTMLElement, parent: SelectOption[]): void {
    // Find the span element that contains the folder info
    const folderSpan = li.querySelector(':scope > span');
    if (!folderSpan) return;

    const dataTid = folderSpan.getAttribute('data-tid');
    const folderName = folderSpan.text.trim();

    if (!dataTid || !folderName) return;

    // Check if this folder has children (look for a <ul> sibling)
    const childrenUl = li.querySelector(':scope > ul');

    if (childrenUl) {
      // This is a parent folder with children
      const childItems: SelectOption[] = [];

      // Process each child <li> element
      const childLis = childrenUl.querySelectorAll(':scope > li');
      childLis.forEach((childLi) => {
        this.parseFolderItem(childLi, childItems);
      });

      // Create a group entry for this folder
      parent.push({
        label: folderName,
        items: childItems,
        value: dataTid,
      });
    } else {
      // This is a leaf folder (no children)
      parent.push({
        value: dataTid,
        label: folderName,
      });
    }
  }

  createFileModel(): AryionFileSubmission {
    return new AryionFileSubmission();
  }

  calculateImageResize(): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<AryionFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    const { options } = postData;
    const file = files[0];

    // Filter out 'vore' and 'non-vore' tags from the tags list
    const filteredTags = options.tags
      .filter((tag) => !tag.toLowerCase().match(/^vore$/i))
      .filter((tag) => !tag.toLowerCase().match(/^non-vore$/i));

    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .addFile('file', file)
      .addFile('thumb', file)
      .setField('desc', options.description)
      .setField('title', options.title)
      .setField('tags', filteredTags.join('\n'))
      .setField('reqtag[]', options.requiredTag === '1' ? 'Non-Vore' : '')
      .setField('view_perm', options.viewPermissions)
      .setField('comment_perm', options.commentPermissions)
      .setField('tag_perm', options.tagPermissions)
      .setField('scrap', options.scraps ? 'on' : '')
      .setField('parentid', options.folder)
      .setField('action', 'new-item')
      .setField('MAX_FILE_SIZE', '104857600');

    const result = await builder.send<string>(
      `${this.BASE_URL}/g4/itemaction.php`,
    );

    try {
      // Split errors/warnings if they exist and handle them separately
      const responses = result.body
        .trim()
        .split('\n')
        .map((r) => r?.trim());

      if (responses.length > 1 && responses[0].indexOf('Warning:') === -1) {
        return PostResponse.fromWebsite(this)
          .withAdditionalInfo(result.body)
          .withException(new Error('Server returned warnings or errors'));
      }

      // Parse the JSON response
      const jsonResponse = responses[responses.length - 1].replace(
        /(<textarea>|<\/textarea>)/g,
        '',
      );
      const json = JSON.parse(jsonResponse);

      if (json.id) {
        return PostResponse.fromWebsite(this).withSourceUrl(
          `${this.BASE_URL}${json.url}`,
        );
      }
    } catch (err) {
      // If JSON parsing fails, return the raw response
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(new Error('Failed to post'));
  }

  async onValidateFileSubmission(
    postData: PostData<AryionFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<AryionFileSubmission>();
    const { options } = postData;

    // Validate required folder selection
    if (options.folder) {
      const folderExists = SelectOptionUtil.findOptionById(
        this.websiteDataStore.getData()?.folders ?? [],
        options.folder,
      );
      if (!folderExists) {
        validator.error('validation.folder.missing-or-invalid', {}, 'folder');
      }
    }

    return validator.result;
  }
}

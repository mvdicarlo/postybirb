import { DescriptionType, DynamicObject, ILoginState } from '@postybirb/types';
import { SupportsDescription } from '../../decorators/supports-description.decorator';
import { SupportsTags } from '../../decorators/supports-tags.decorator';
import { Website } from '../../website';

// This is a stub used for filling in for places where we have a null account
// but need to have a website instance.
@SupportsTags()
@SupportsDescription(DescriptionType.PLAINTEXT)
export default class DefaultWebsite extends Website<DynamicObject> {
  protected BASE_URL: string;

  public externallyAccessibleWebsiteDataProperties: DynamicObject = {};

  public onLogin(): Promise<ILoginState> {
    throw new Error('Method not implemented.');
  }
}

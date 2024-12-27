import { ILoginState } from '@postybirb/types';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { Website } from '../../website';

export type FooAccountData = {
  sensitiveProperty: string;
  nonSensitiveProperty: string[];
};

@WebsiteMetadata({
  name: 'foo',
  displayName: 'Foo',
})
export default class Foo extends Website<FooAccountData> {
  protected BASE_URL: string;

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<FooAccountData> =
    {
      nonSensitiveProperty: true,
      sensitiveProperty: false,
    };

  public async onLogin(): Promise<ILoginState> {
    if (this.account.name === 'test') {
      this.loginState.logout();
    }

    await this.websiteDataStore.setData({
      sensitiveProperty: '<SECRET-API-KEY>',
      nonSensitiveProperty: ['folder1', 'folder2'],
    });
    return this.loginState.setLogin(true, 'TestUser');
  }
}

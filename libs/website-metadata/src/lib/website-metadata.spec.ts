import { websiteMetadata } from './website-metadata';

describe('websiteMetadata', () => {
  it('should work', () => {
    expect(websiteMetadata()).toEqual('website-metadata');
  });
});

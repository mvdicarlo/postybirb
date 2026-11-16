import { BlueskyFileSubmission } from '../implementations/bluesky/models/bluesky-file-submission';
import { InstagramFileSubmission } from '../implementations/instagram/models/instagram-file-submission';
import { MegalodonFileSubmission } from '../implementations/megalodon/models/megalodon-file-submission';
import { MisskeyFileSubmission } from '../implementations/misskey/models/misskey-file-submission';
import { TwitterFileSubmission } from '../implementations/twitter/models/twitter-file-submission';
import { BaseWebsiteOptions } from './base-website-options';
import { DefaultWebsiteOptions } from './default-website-options';
import { applyTagCase } from './tag-case';

describe('applyTagCase', () => {
  it('should leave the tag as is in snake case or when unset', () => {
    expect(applyTagCase('blue sky fox', 'snake')).toBe('blue sky fox');
    expect(applyTagCase('blue sky fox')).toBe('blue sky fox');
  });

  it('should join the words in camel case', () => {
    expect(applyTagCase('blue sky fox', 'camel')).toBe('blueSkyFox');
    expect(applyTagCase('blue   sky\tfox', 'camel')).toBe('blueSkyFox');
    expect(applyTagCase('furry', 'camel')).toBe('furry');
  });

  it('should join the words in pascal case', () => {
    expect(applyTagCase('blue sky fox', 'pascal')).toBe('BlueSkyFox');
    expect(applyTagCase('furry', 'pascal')).toBe('Furry');
    expect(applyTagCase('élan vital', 'pascal')).toBe('ÉlanVital');
  });

  it('should join the words in lower case', () => {
    expect(applyTagCase('blue sky fox', 'lower')).toBe('blueskyfox');
    expect(applyTagCase('blue   sky\tfox', 'lower')).toBe('blueskyfox');
    expect(applyTagCase('Furry Art', 'lower')).toBe('furryart');
    expect(applyTagCase('my OC', 'lower')).toBe('myoc');
    expect(applyTagCase('Élan Vital', 'lower')).toBe('élanvital');
    expect(applyTagCase('top 10 art', 'lower')).toBe('top10art');
  });

  it('should never lower what was typed in upper case in camel and pascal case', () => {
    expect(applyTagCase('my OC', 'camel')).toBe('myOC');
    expect(applyTagCase('my OC', 'pascal')).toBe('MyOC');
    expect(applyTagCase('OC', 'camel')).toBe('OC');
  });

  it('should keep words that do not start with a letter', () => {
    expect(applyTagCase('top 10 art', 'pascal')).toBe('Top10Art');
    expect(applyTagCase('blue_sky fox', 'camel')).toBe('blue_skyFox');
  });
});

describe('tag case option', () => {
  const tags = { overrideDefault: true, tags: ['blue sky fox', 'furry'] };

  it.each([
    ['Mastodon', MegalodonFileSubmission],
    ['Misskey', MisskeyFileSubmission],
    ['Bluesky', BlueskyFileSubmission],
    ['Instagram', InstagramFileSubmission],
    ['Twitter', TwitterFileSubmission],
  ])('should be offered by %s and default to snake case', async (_, Model) => {
    const options = Object.assign(new Model(), { tags });
    const field = options.getFormFields().tagCase;

    expect(field.formField).toBe('select');
    expect(field.defaultValue).toBe('snake');
    expect(field).toMatchObject({
      options: [
        { value: 'snake' },
        { value: 'camel' },
        { value: 'pascal' },
        { value: 'lower' },
      ],
    });
    expect(await options.getProcessedTags()).toEqual(['blue_sky_fox', 'furry']);
  });

  it('should not be offered by websites that did not ask for it', async () => {
    const options = new BaseWebsiteOptions({ tags });

    expect(options.getFormFields().tagCase).toBeUndefined();
    expect(await options.getProcessedTags()).toEqual(['blue_sky_fox', 'furry']);
  });

  it('should write the tags in the chosen case', async () => {
    const camel = Object.assign(new MegalodonFileSubmission(), {
      tags,
      tagCase: 'camel',
    });
    const pascal = Object.assign(new BlueskyFileSubmission(), {
      tags,
      tagCase: 'pascal',
    });

    const lower = Object.assign(new TwitterFileSubmission(), {
      tags: { overrideDefault: true, tags: ['Furry Art', 'furry'] },
      tagCase: 'lower',
    });

    expect(await camel.getProcessedTags()).toEqual(['blueSkyFox', 'furry']);
    expect(await pascal.getProcessedTags()).toEqual(['BlueSkyFox', 'Furry']);
    expect(await lower.getProcessedTags()).toEqual(['furryart', 'furry']);
  });

  it('should apply the case to the output of a tag converter', async () => {
    const options = Object.assign(new MisskeyFileSubmission(), {
      tags,
      tagCase: 'pascal',
    });
    const convert = async (tag: string) =>
      tag === 'furry' ? 'anthro art' : tag;

    expect(await options.getProcessedTags(convert)).toEqual([
      'BlueSkyFox',
      'AnthroArt',
    ]);
  });

  it('should keep the chosen case when the defaults are merged', async () => {
    const options = Object.assign(new InstagramFileSubmission(), {
      tags: { overrideDefault: false, tags: ['blue sky fox'] },
      tagCase: 'camel',
    });
    const merged = options.mergeDefaults(
      new DefaultWebsiteOptions({
        tags: { overrideDefault: false, tags: ['digital art'] },
      }),
    );

    expect(await merged.getProcessedTags()).toEqual([
      'blueSkyFox',
      'digitalArt',
    ]);
  });
});

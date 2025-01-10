import { IWebsiteOptions, SubmissionRating } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';
import { RatingParser } from './rating-parser';

describe('RatingParser', () => {
  let parser: RatingParser;

  beforeEach(() => {
    parser = new RatingParser();
  });

  it('should parse rating', () => {
    const options: IWebsiteOptions = {
      data: {
        rating: SubmissionRating.ADULT,
      },
    } as IWebsiteOptions;
    const defaultOptions: IWebsiteOptions = {
      data: {
        rating: SubmissionRating.GENERAL,
      },
    } as IWebsiteOptions;
    expect(
      parser.parse(
        new DefaultWebsiteOptions(defaultOptions.data),
        new BaseWebsiteOptions(options.data),
      ),
    ).toEqual(SubmissionRating.ADULT);
  });

  it('should parse default rating', () => {
    const options: IWebsiteOptions = {
      data: {},
    } as IWebsiteOptions;
    const defaultOptions: IWebsiteOptions = {
      data: {
        rating: SubmissionRating.GENERAL,
      },
    } as IWebsiteOptions;
    expect(
      parser.parse(
        new DefaultWebsiteOptions(defaultOptions.data),
        new BaseWebsiteOptions(options.data),
      ),
    ).toEqual(SubmissionRating.GENERAL);
  });

  it('should throw on parsing no rating', () => {
    expect(() =>
      parser.parse(
        { rating: null } as unknown as DefaultWebsiteOptions,
        { rating: null } as unknown as BaseWebsiteOptions,
      ),
    ).toThrow(Error);
  });
});

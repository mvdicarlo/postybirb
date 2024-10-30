import { IWebsiteOptions, SubmissionRating } from '@postybirb/types';
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
    expect(parser.parse(defaultOptions, options)).toEqual(
      SubmissionRating.ADULT,
    );
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
    expect(parser.parse(defaultOptions, options)).toEqual(
      SubmissionRating.GENERAL,
    );
  });

  it('should throw on parsing no rating', () => {
    const options: IWebsiteOptions = {
      data: {},
    } as IWebsiteOptions;
    const defaultOptions: IWebsiteOptions = {
      data: {},
    } as IWebsiteOptions;
    expect(() => parser.parse(defaultOptions, options)).toThrow(Error);
  });
});

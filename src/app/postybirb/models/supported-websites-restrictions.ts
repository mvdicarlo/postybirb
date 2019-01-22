import { SupportedWebsites } from '../../commons/enums/supported-websites';
import { FileObject } from '../../commons/interfaces/file-obect.interface';
import { Rating } from '../enums/rating.enum';
import { SubmissionType } from '../enums/submission-type.enum';

export class SupportedWebsiteRestrictions {
  private static webMap: any = {
    [SupportedWebsites.Aryion]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['jpg', 'jpeg', 'gif', 'png', 'doc', 'docx', 'xls', 'xlsx', 'swf', 'vsd', 'txt', 'rtf', 'avi', 'mpg', 'mpeg', 'flv', 'mp4'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.STORY, SubmissionType.ANIMATION, SubmissionType.MUSIC],
      supportedFileSize: {
        default: 20, // a guess
      }
    },
    [SupportedWebsites.Derpibooru]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'svg', 'gif'],
      supportedTypes: [SubmissionType.ARTWORK],
      supportedFileSize: {
        default: 50, // a guess
      }
    },
    [SupportedWebsites.DeviantArt]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'bmp', 'flv', 'txt', 'rtf', 'odt', 'swf', 'tiff', 'tif'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.STORY, SubmissionType.ANIMATION],
      supportedFileSize: {
        default: 30,
        Animation: 200
      }
    },
    [SupportedWebsites.e621]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'gif', 'webm'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.ANIMATION],
      supportedFileSize: {
        default: 100
      }
    },
    [SupportedWebsites.Furaffinity]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['jpg', 'gif', 'png', 'jpeg', 'jpg', 'swf', 'doc', 'docx', 'rtf', 'txt', 'pdf', 'odt', 'mid', 'wav', 'mp3', 'mpeg', 'mpg'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.STORY, SubmissionType.ANIMATION, SubmissionType.MUSIC],
      supportedFileSize: {
        default: 10
      }
    },
    [SupportedWebsites.Furiffic]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'doc', 'docx', 'rtf', 'pdf', 'txt', 'swf', 'flv', 'mp3', 'mp4'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.STORY, SubmissionType.ANIMATION, SubmissionType.MUSIC],
      supportedFileSize: {
        default: 25
      }
    },
    [SupportedWebsites.FurryAmino]: {
      supportedRatings: [Rating.GENERAL],
      supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif'],
      supportedTypes: [SubmissionType.ARTWORK],
      supportedFileSize: {
        default: 10 // a guess
      }
    },
    [SupportedWebsites.FurryNetwork]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'mp3', 'mp4', 'webm', 'swf', 'gif', 'wav', 'txt'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.STORY, SubmissionType.ANIMATION, SubmissionType.MUSIC],
      supportedFileSize: {
        default: 32,
        Animation: 200
      }
    },
    [SupportedWebsites.HentaiFoundry]: { // This is essentially all a guess
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'svg', 'gif'],
      supportedTypes: [SubmissionType.ARTWORK],
      supportedFileSize: {
        default: 50, // a guess
      }
    },
    [SupportedWebsites.Inkbunny]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif', 'swf', 'flv', 'mp4', 'doc', 'rtf', 'txt', 'mp3'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.STORY, SubmissionType.ANIMATION, SubmissionType.MUSIC],
      supportedFileSize: {
        default: 300
      }
    },
    [SupportedWebsites.Mastodon]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'mp4', 'mov'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.ANIMATION],
      supportedFileSize: {
        default: 8,
      }
    },
    [SupportedWebsites.Newgrounds]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'gif', 'bmp'],
      supportedTypes: [SubmissionType.ARTWORK],
      supportedFileSize: {
        default: 40, // I think this is the right amount
      }
    },
    [SupportedWebsites.PaigeeWorld]: {
      supportedRatings: [Rating.GENERAL],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif'],
      supportedTypes: [SubmissionType.ARTWORK],
      supportedFileSize: {
        default: 50
      }
    },
    [SupportedWebsites.Patreon]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif', 'midi', 'ogg', 'oga', 'wav', 'x-wav', 'webm', 'mp3', 'mpeg', 'pdf', 'txt', 'rtf', 'md'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.STORY, SubmissionType.MUSIC],
      supportedFileSize: {
        default: 200
      }
    },
    [SupportedWebsites.Pixiv]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif'],
      supportedTypes: [SubmissionType.ARTWORK],
      supportedFileSize: {
        default: 8
      }
    },
    [SupportedWebsites.Route50]: {
      supportedRatings: [Rating.GENERAL],
      supportedFileTypes: ['jpg', 'jpreg', 'png', 'gif', 'txt', 'mp3', 'midi', 'css', 'swf'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.STORY, SubmissionType.ANIMATION, SubmissionType.MUSIC],
      supportedFileSize: {
        default: 10
      }
    },
    [SupportedWebsites.SoFurry]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif', 'swf', 'txt'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.STORY, SubmissionType.ANIMATION, SubmissionType.MUSIC],
      supportedFileSize: {
        default: 50
      }
    },
    [SupportedWebsites.Tumblr]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE,],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif', 'mp3', 'mp4'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.ANIMATION, SubmissionType.MUSIC],
      supportedFileSize: {
        default: 10,
        Artwork: {
          gif: 1
        },
        Animation: 100
      }
    },
    [SupportedWebsites.Twitter]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
      supportedTypes: [SubmissionType.ARTWORK],
      supportedFileSize: {
        default: 5,
        Artwork: {
          gif: 15
        }
      }
    },
    [SupportedWebsites.Weasyl]: {
      supportedRatings: [Rating.GENERAL, Rating.MATURE, Rating.ADULT, Rating.EXTREME],
      supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'md', 'txt', 'pdf', 'swf', 'mp3'],
      supportedTypes: [SubmissionType.ARTWORK, SubmissionType.STORY, SubmissionType.ANIMATION, SubmissionType.MUSIC],
      supportedFileSize: {
        default: 10,
        Story: {
          pdf: 10,
          md: 2,
          txt: 2
        },
        Music: 15,
        Animation: 15
      }
    }
  };

  public static getSupported(): any {
    return Object.assign({}, this.webMap);
  }

  private static isWithinFileSizeLimit(website: any, type: string, fileExtension: string, size: number): any {
    const sizeRequirements = website.supportedFileSize;
    let sizeLimit: number = 0;
    const category: any = sizeRequirements[type];
    if (typeof category === 'object') {
      sizeLimit = category[fileExtension] || sizeRequirements.default;
    } else {
      //Assume number or null
      sizeLimit = category || sizeRequirements.default;
    }

    return size <= Math.pow(1024, 2) * sizeLimit ? 0 : sizeLimit;
  }

  public static verifyWebsiteRestrictionsAndIncompatibilities(file: File|FileObject, rating: string, type: string, websites: string[]): any {
    const issues: any = {};

    const fileExtension: string = file.name.split('.').pop().toLowerCase();

    for (let i = 0; i < websites.length; i++) {
      const website = websites[i];
      if (!issues.hasOwnProperty(website)) issues[website] = {};
      const w: any = this.webMap[website];

      if (rating && !w.supportedRatings.includes(rating)) {
        issues[website].unsupportedByRating = rating === Rating.ADULT ? 'Adult' : rating;
      }

      if (type && !w.supportedTypes.includes(type)) {
        issues[website].unsupportedByType = type;
      }

      if (!w.supportedFileTypes.includes(fileExtension)) {
        issues[website].unsupportedByFileExtension = fileExtension;
      }

      const sizeLimit = this.isWithinFileSizeLimit(w, type, fileExtension, file.size);
      if (sizeLimit > 0) {
        issues[website].unsupportedByFileSize = sizeLimit;
      }
    }

    const notEmptyIssues: any = {};

    Object.keys(issues).forEach(key => {
      if (Object.keys(issues[key]).length) {
        notEmptyIssues[key] = issues[key];
      }
    });

    return notEmptyIssues;
  }
}

import { SupportedWebsites } from '../../commons/enums/supported-websites';
import { FileObject } from '../../commons/interfaces/file-obect.interface';

export class SupportedWebsiteRestrictions {
  private static webMap: any = {
    [SupportedWebsites.Aryion]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['jpg', 'jpeg', 'gif', 'png', 'doc', 'docx', 'xls', 'xlsx', 'swf', 'vsd', 'txt', 'rtf', 'avi', 'mpg', 'mpeg', 'flv', 'mp4'],
      supportedTypes: ['Artwork', 'Story', 'Animation', 'Music'],
      supportedFileSize: {
        default: 20, // a guess
      }
    },
    [SupportedWebsites.Derpibooru]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'svg', 'gif'],
      supportedTypes: ['Artwork'],
      supportedFileSize: {
        default: 50, // a guess
      }
    },
    [SupportedWebsites.DeviantArt]: {
      supportedRatings: ['General', 'Mature'],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'bmp', 'flv', 'txt', 'rtf', 'odt', 'swf', 'tiff', 'tif'],
      supportedTypes: ['Artwork', 'Story', 'Animation'],
      supportedFileSize: {
        default: 30,
        Animation: 200
      }
    },
    [SupportedWebsites.e621]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'gif', 'webm'],
      supportedTypes: ['Artwork', 'Animation'],
      supportedFileSize: {
        default: 100
      }
    },
    [SupportedWebsites.Furaffinity]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['jpg', 'gif', 'png', 'jpeg', 'jpg', 'swf', 'doc', 'docx', 'rtf', 'txt', 'pdf', 'odt', 'mid', 'wav', 'mp3', 'mpeg', 'mpg'],
      supportedTypes: ['Artwork', 'Story', 'Animation', 'Music'],
      supportedFileSize: {
        default: 10
      }
    },
    [SupportedWebsites.FurryNetwork]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'mp3', 'mp4', 'webm', 'swf', 'gif', 'wav', 'txt'],
      supportedTypes: ['Artwork', 'Story', 'Animation', 'Music'],
      supportedFileSize: {
        default: 32,
        Animation: 200
      }
    },
    [SupportedWebsites.Furiffic]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['jpg', 'jpreg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'doc', 'docx', 'rtf', 'pdf', 'txt', 'swf', 'flv', 'mp3', 'mp4'],
      supportedTypes: ['Artwork', 'Story', 'Animation', 'Music'],
      supportedFileSize: {
        default: 25
      }
    },
    [SupportedWebsites.HentaiFoundry]: { // This is essentially all a guess
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'svg', 'gif'],
      supportedTypes: ['Artwork'],
      supportedFileSize: {
        default: 50, // a guess
      }
    },
    [SupportedWebsites.Inkbunny]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif', 'swf', 'flv', 'mp4', 'doc', 'rtf', 'txt', 'mp3'],
      supportedTypes: ['Artwork', 'Story', 'Animation', 'Music'],
      supportedFileSize: {
        default: 300
      }
    },
    [SupportedWebsites.Mastodon]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'mp4', 'mov'],
      supportedTypes: ['Artwork', 'Animation'],
      supportedFileSize: {
        default: 8,
      }
    },
    [SupportedWebsites.PaigeeWorld]: {
      supportedRatings: ['General'],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif'],
      supportedTypes: ['Artwork'],
      supportedFileSize: {
        default: 50
      }
    },
    [SupportedWebsites.Patreon]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif', 'midi', 'ogg', 'oga', 'wav', 'x-wav', 'webm', 'mp3', 'mpeg', 'pdf', 'txt', 'rtf', 'md'],
      supportedTypes: ['Artwork', 'Music', 'Story'],
      supportedFileSize: {
        default: 200
      }
    },
    [SupportedWebsites.Pixiv]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif'],
      supportedTypes: ['Artwork'],
      supportedFileSize: {
        default: 8
      }
    },
    [SupportedWebsites.Route50]: {
      supportedRatings: ['General'],
      supportedFileTypes: ['jpg', 'jpreg', 'png', 'gif', 'txt', 'mp3', 'midi', 'css', 'swf'],
      supportedTypes: ['Artwork', 'Story', 'Animation', 'Music'],
      supportedFileSize: {
        default: 10
      }
    },
    [SupportedWebsites.SoFurry]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif', 'swf', 'txt'],
      supportedTypes: ['Artwork', 'Animation', 'Music', 'Story'],
      supportedFileSize: {
        default: 50
      }
    },
    [SupportedWebsites.Tumblr]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif', 'mp3', 'mp4'],
      supportedTypes: ['Artwork', 'Animation', 'Music'],
      supportedFileSize: {
        default: 10,
        Artwork: {
          gif: 1
        },
        Animation: 100
      }
    },
    [SupportedWebsites.Twitter]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
      supportedTypes: ['Artwork'],
      supportedFileSize: {
        default: 5,
        Artwork: {
          gif: 15
        }
      }
    },
    [SupportedWebsites.Weasyl]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'md', 'txt', 'pdf', 'swf', 'mp3'],
      supportedTypes: ['Artwork', 'Story', 'Animation', 'Music'],
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

  private static convertFileSizeToMB(size): number {
    return size / 1000000;
  }

  private static fileSizeSupported(website: any, type: string, file: File | FileObject): boolean {
    const fileSize = this.convertFileSizeToMB(file.size);
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const sizeRequirements = website.supportedFileSize;

    let sizeLimit: number = 0;
    const category: any = sizeRequirements[type];
    if (typeof category === 'object') {
      sizeLimit = category[fileExtension] || sizeRequirements.default;
    } else {
      //Assume number or null
      sizeLimit = category || sizeRequirements.default;
    }

    return fileSize <= sizeLimit;
  }

  private static isWithinFileSizeLimit(website: any, type: string, fileExtension: string, size: number): any {
    const fileSize = this.convertFileSizeToMB(size);
    const sizeRequirements = website.supportedFileSize;
    let sizeLimit: number = 0;
    const category: any = sizeRequirements[type];
    if (typeof category === 'object') {
      sizeLimit = category[fileExtension] || sizeRequirements.default;
    } else {
      //Assume number or null
      sizeLimit = category || sizeRequirements.default;
    }

    return fileSize <= sizeLimit ? 0 : sizeLimit;
  }

  public static verifyWebsiteRestrictionsAndIncompatibilities(file: File, rating: string, type: string, websites: string[]): any {
    const issues: any = {};

    const fileExtension: string = file.name.split('.').pop().toLowerCase();

    for (let i = 0; i < websites.length; i++) {
      const website = websites[i];
      if (!issues.hasOwnProperty(website)) issues[website] = {};
      const w: any = this.webMap[website];

      if (rating && !w.supportedRatings.includes(rating)) {
        issues[website].unsupportedByRating = rating === 'Explicit' ? 'Adult' : rating;
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

import { SupportedWebsites } from '../../commons/enums/supported-websites';
import { FileObject } from '../../commons/interfaces/file-obect.interface';

export interface Restrictions {
  unsupportedByRating: any[];
  unsupportedByType: any[];
  unsupportedByExtension: any[];
  unsupportedByFileSize: any[];
  supported: any[];
  valid: boolean;
  hasInvalid: boolean;
}

export class SupportedWebsiteRestrictions {
  private static webMap: any = {
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
    [SupportedWebsites.Inkbunny]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif', 'swf', 'flv', 'mp4', 'doc', 'rtf', 'txt', 'mp3'],
      supportedTypes: ['Artwork', 'Story', 'Animation', 'Music'],
      supportedFileSize: {
        default: 300
      }
    },
    [SupportedWebsites.Patreon]: {
      supportedRatings: ['General', 'Mature', 'Explicit', 'Extreme'],
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif', 'midi', 'ogg', 'oga', 'wav', 'x-wav', 'webm', 'mp3', 'mpeg'],
      supportedTypes: ['Artwork', 'Music'],
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
      supportedFileTypes: ['png', 'jpeg', 'jpg', 'gif', 'mp3'],
      supportedTypes: ['Artwork', 'Animation', 'Music'],
      supportedFileSize: {
        default: 10,
        Artwork: {
          gif: 1
        }
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

  public static getSupportedWebsites(rating: string, submissionType: string, file: File | FileObject): Restrictions {
    const obj: Restrictions = {
      supported: [],
      unsupportedByType: [],
      unsupportedByRating: [],
      unsupportedByExtension: [],
      unsupportedByFileSize: [],
      valid: false,
      hasInvalid: false
    };

    if (!rating || !submissionType || !file) return obj;

    const fileExtension = file.name.split('.').pop().toLowerCase();

    for (let key in this.webMap) {
      const website = this.webMap[key];

      if (!website.supportedRatings.includes(rating)) {
        obj.unsupportedByRating.push(key);
        obj.hasInvalid = true;
      } else if (!website.supportedTypes.includes(submissionType)) {
        obj.unsupportedByType.push(key);
        obj.hasInvalid = true;
      } else if (!website.supportedFileTypes.includes(fileExtension)) {
        obj.unsupportedByExtension.push(key);
        obj.hasInvalid = true;
      } else if (!this.fileSizeSupported(website, submissionType, file)) {
        obj.unsupportedByFileSize.push(key);
        obj.hasInvalid = true;
      } else {
        obj.supported.push(key);
      }
    }

    if (obj.supported.length > 0) {
      obj.valid = true;
    }

    return obj;
  }
}

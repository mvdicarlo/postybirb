import { ITable, DATA_TYPE } from 'jsstore';
import { FileObject } from './submission-file.table';
import { SubmissionFormData, PostStats } from '../models/submission.model';

export interface ISubmission {
  id: number;
  title: string;
  rating: SubmissionRating;
  schedule?: number;
  isScheduled?: boolean; // whether or not the schedule is active
  submissionType: SubmissionType;
  fileInfo?: FileObject; // not required in journal types
  additionalFileInfo?: FileObject[];
  ignoreAdditionalFilesMap?: { [key: string]: string[] };
  fileMap?: FileMap;
  formData?: SubmissionFormData;
  postStats?: PostStats;
}

export interface FileMap {
  PRIMARY?: number;
  THUMBNAIL?: number;
  ADDITIONAL?: number[];
}

export enum SubmissionRating {
  GENERAL = 'General',
  MATURE = 'Mature',
  ADULT = 'Adult',
  EXTREME = 'Extreme'
}

export enum SubmissionType {
  SUBMISSION = 'SUBMISSION',
  JOURNAL = 'JOURNAL'
}

const SubmissionTableName: string = 'Submission';

const SubmissionTable: ITable = {
  name: SubmissionTableName,
  columns: {
    id: {
      notNull: true,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      dataType: DATA_TYPE.String,
      default: 'New Submission'
    },
    rating: {
      dataType: DATA_TYPE.String

    },
    submissionType: {
      dataType: DATA_TYPE.String,
      notNull: true
    },
    schedule: {
      dataType: DATA_TYPE.Number
    },
    isScheduled: {
      dataType: DATA_TYPE.Boolean,
      default: false
    },
    fileInfo: {
      dataType: DATA_TYPE.Object
    },
    additionalFileInfo: {
      dataType: DATA_TYPE.Array
    },
    fileMap: {
      dataType: DATA_TYPE.Object
    },
    formData: {
      dataType: DATA_TYPE.Object
    },
    postStats: {
      dataType: DATA_TYPE.Object
    }
  }
};

export { SubmissionTable, SubmissionTableName }

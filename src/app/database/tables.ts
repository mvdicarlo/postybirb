import { ITable } from "jsstore";
import { SubmissionFileTable } from './tables/submission-file.table';
import { SubmissionTable } from './tables/submission.table';
import { GeneratedThumbnailTable } from './tables/generated-thumbnail.table';

const PostyBirbTables: ITable[] = [
  SubmissionFileTable,
  SubmissionTable,
  GeneratedThumbnailTable
];

export { PostyBirbTables }

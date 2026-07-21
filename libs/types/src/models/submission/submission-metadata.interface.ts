import type { SubmissionId } from './submission.interface';

export interface ISubmissionMetadata {
  template?: SubmissionTemplateMetadata;

  /**
   * Ids of other submissions this submission depends on. A dependent
   * submission is not handed to the posting engine until every submission
   * listed here has a successfully-completed post job. Used to enforce
   * cross-submission posting order (e.g. comic pages). Stored here in the
   * submission metadata JSON blob (no dedicated schema column).
   */
  dependsOn?: SubmissionId[];
}

export type SubmissionTemplateMetadata = {
  name: string;
};

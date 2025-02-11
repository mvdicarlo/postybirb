import { SubmissionId } from '../../models';

/**
 * The DTO for applying a submission's data to multiple submissions.
 *
 * @interface IApplyMultiSubmissionDto
 */
export type IApplyMultiSubmissionDto = {
  /**
   * The origin submission id.
   * @type {SubmissionId}
   */
  submissionToApply: SubmissionId;

  /**
   * The submission ids to apply the origin submission to.
   *
   * @type {SubmissionId[]}
   */
  submissionIds: SubmissionId[];

  /**
   * Whether to merge the origin submission data with the target submissions.
   *
   * A value of `true` will result in the overwrite of overlapping website options, but the preservation of unique options.
   * A value of `false` will result in the overwrite of all website options, and delete the non-included options.
   * @type {boolean}
   */
  merge: boolean;
};

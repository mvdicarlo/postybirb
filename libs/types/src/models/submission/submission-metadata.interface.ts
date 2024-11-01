export interface ISubmissionMetadata {
  template?: SubmissionTemplateMetadata;
  isMultiSubmission?: boolean;
}

export type SubmissionTemplateMetadata = {
  name: string;
};

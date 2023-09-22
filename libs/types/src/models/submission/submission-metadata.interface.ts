// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ISubmissionMetadata {
  template?: SubmissionTemplateMetadata;
}

export type SubmissionTemplateMetadata = {
  name: string;
};

import { Submission } from 'src/app/database/models/submission.model';

export function validate(submission: Submission): string[] {
  const problems = [];

  if (!submission.rating) problems.push('Rating missing');

  return problems;
}

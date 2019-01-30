import { Routes } from '@angular/router';
import { BulkUpdateForm } from './forms/bulk-update-form/bulk-update-form.component';
import { TemplateForm } from './forms/template-form/template-form.component';
import { SubmissionForm } from './forms/submission-form/submission-form.component';
import { JournalForm } from './forms/journal-form/journal-form.component';

const PostybirbRoutes: Routes = [
  {
    path: 'bulk',
    component: BulkUpdateForm
  },
  {
    path: 'template',
    component: TemplateForm
  },
  {
    path: 'submission/:id',
    component: SubmissionForm
  },
  {
    path: 'journal/:id',
    component: JournalForm
  },
  {
    path: '**',
    redirectTo: '/bulk'
  },
];

export {
  PostybirbRoutes
}

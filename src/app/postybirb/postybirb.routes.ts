import { Routes } from '@angular/router';
import { BulkUpdateForm } from './forms/bulk-update-form/bulk-update-form.component';
import { TemplateForm } from './forms/template-form/template-form.component';
import { SubmissionForm } from './forms/submission-form/submission-form.component';
import { JournalForm } from './forms/journal-form/journal-form.component';
import { PostLogs } from './components/post-logs/post-logs.component';
import { LandingPage } from './pages/landing-page/landing-page.component';
import { SaveOnlyJournalForm } from './forms/save-only-journal-form/save-only-journal-form.component';
import { SaveOnlySubmissionForm } from './forms/save-only-submission-form/save-only-submission-form.component';

const PostybirbRoutes: Routes = [
  {
    path: 'home',
    component: LandingPage
  },
  {
    path: 'bulk',
    component: BulkUpdateForm
  },
  {
    path: 'template',
    component: TemplateForm
  },
  {
    path: 'logs',
    component: PostLogs
  },
  {
    path: 'submission/:id',
    component: SubmissionForm
  },
  {
    path: 'submission/save-only/:id',
    component: SaveOnlySubmissionForm
  },
  {
    path: 'journal/:id',
    component: JournalForm
  },
  {
    path: 'journal/save-only/:id',
    component: SaveOnlyJournalForm
  },
  {
    path: '**',
    redirectTo: 'home'
  },
];

export {
  PostybirbRoutes
}

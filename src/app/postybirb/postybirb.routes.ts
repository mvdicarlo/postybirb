import { Routes } from '@angular/router';
import { BulkUpdateForm } from './forms/bulk-update-form/bulk-update-form.component';
import { TemplateForm } from './forms/template-form/template-form.component';
import { SubmissionForm } from './forms/submission-form/submission-form.component';
import { JournalForm } from './forms/journal-form/journal-form.component';
import { PostLogs } from './components/post-logs/post-logs.component';
import { LandingPage } from './pages/landing-page/landing-page.component';

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
    path: 'journal/:id',
    component: JournalForm
  },
  {
    path: '**',
    redirectTo: 'home'
  },
];

export {
  PostybirbRoutes
}

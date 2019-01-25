import { Routes } from '@angular/router';
import { BulkUpdateForm } from './forms/bulk-update-form/bulk-update-form.component';
import { TemplateForm } from './forms/template-form/template-form.component';

const PostybirbRoutes: Routes = [
  {
    path: 'bulk',
    component: BulkUpdateForm
  },
  {
    path: 'template',
    component: TemplateForm
  }
];

export {
  PostybirbRoutes
}

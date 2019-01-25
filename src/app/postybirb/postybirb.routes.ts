import { Routes } from '@angular/router';
import { BulkUpdateForm } from './forms/bulk-update-form/bulk-update-form.component';

const PostybirbRoutes: Routes = [
  {
    path: 'bulk',
    component: BulkUpdateForm
  }
]

export {
  PostybirbRoutes
}

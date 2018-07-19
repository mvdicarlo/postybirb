import { Component, ViewChild, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { PostyBirbStateAction } from '../../../posty-birb/stores/states/posty-birb.state';
import { TemplatesService } from '../../../posty-birb/services/templates/templates.service';

@Component({
  selector: 'postybirb-config',
  templateUrl: './postybirb-config.component.html',
  styleUrls: ['./postybirb-config.component.css']
})
export class PostybirbConfigComponent implements OnDestroy {
  @ViewChild('templateSelect') templateSelect: any;
  enableTemplateDelete: boolean;
  selectedTemplate: any;

  private submissions: any = null;
  private subscription: Subscription = Subscription.EMPTY

  constructor(private _store: Store, private templates: TemplatesService) {
    this.subscription = _store.select(state => state.postybirb.submissions).subscribe(submissions => this.submissions = submissions);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  resetScheduled(): void {
    this._store.dispatch(this.submissions.filter(s => s.meta.schedule).map(s => new PostyBirbStateAction.DeleteSubmission(s)));
  }

  resetUnscheduled(): void {
    this._store.dispatch(this.submissions.filter(s => !s.meta.schedule).map(s => new PostyBirbStateAction.DeleteSubmission(s)));
  }

  resetTemplates(): void {
    this.templates.deleteAll();
  }

  resetAllSettings(): void {
    this.resetScheduled();
    this.resetUnscheduled();
    this.resetTemplates();
  }

  deleteTemplate(): void {
    this.enableTemplateDelete = false;
    this.templates.deleteTemplate(this.selectedTemplate.name);
    this.selectedTemplate = null;
  }

  templateSelected(template: any): void {
    this.enableTemplateDelete = true;
    this.selectedTemplate = template;
  }

}

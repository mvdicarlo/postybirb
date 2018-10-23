import { Component, Input } from '@angular/core';
import { SubmissionEditingFormComponent } from '../../submission-editing-form/submission-editing-form.component';
import { TemplatesService, Template } from '../../../services/templates/templates.service';

@Component({
  selector: 'sidebar-navigator',
  templateUrl: './sidebar-navigator.component.html',
  styleUrls: ['./sidebar-navigator.component.css'],
  host: {
    '(click)': '_scrollTo($event)',
    '[class.d-none]': 'item.hidden'
  }
})
export class SidebarNavigatorComponent {
  @Input() item: SubmissionEditingFormComponent;
  public templates: Template[] = [];

  constructor(private templateService: TemplatesService) { }

  public show(): boolean {
    return this.item && (this.item.src || this.item.fileIcon) ? true : false;
  }

  public trackBy(index, template: Template) {
    return template.name
  }

  public trapEvent(event: Event): void {
    event.stopPropagation();
  }

  public async deleteItem() {
    this.item.deleteSubmission();
  }

  public async applyTemplate(template: Template) {
    this.item.templateSelected(template.template);
    this.templates = [];
  }

  public async loadTemplates() {
    if (!this.templates.length) {
      this.templates = this.templateService.getTemplates();
    }
  }

  private _scrollTo(event: Event): void {
    event.stopPropagation();
    this.item.title.nativeElement.focus();
  }

}

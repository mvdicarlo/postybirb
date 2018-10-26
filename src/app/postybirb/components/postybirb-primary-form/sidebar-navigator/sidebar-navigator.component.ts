import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material';
import { SubmissionEditingFormComponent } from '../../submission-editing-form/submission-editing-form.component';
import { TemplatesService, Template } from '../../../services/templates/templates.service';
import { SubmissionViewComponent } from '../../dialog/submission-view/submission-view.component';
import { _copySubmission } from '../../../helpers/submission-manipulation.helper';

@Component({
  selector: 'sidebar-navigator',
  templateUrl: './sidebar-navigator.component.html',
  styleUrls: ['./sidebar-navigator.component.css'],
  host: {
    '(click)': '_scrollTo($event)',
    '[class.d-none]': 'item.hidden',
    '(mouseenter)': '_toggleHighlight()',
    '(mouseleave)': '_toggleHighlight()'
  }
})
export class SidebarNavigatorComponent {
  @Input() item: SubmissionEditingFormComponent;
  public templates: Template[] = [];

  constructor(private templateService: TemplatesService, private dialog: MatDialog) { }

  public show(): boolean {
    return this.item && (this.item.src || this.item.fileIcon) ? true : false;
  }

  public trackBy(index, template: Template) {
    return template.name;
  }

  public trapEvent(event: Event): void {
    event.stopPropagation();
  }

  public async deleteItem() {
    this.item.deleteSubmission();
  }

  public async saveSubmission() {
    this.item.save();
  }

  public async showSummary() {
    this.dialog.open(SubmissionViewComponent, {
      data: this.item._updateSubmission(_copySubmission(this.item.submission)),
      width: '80%'
    });
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

  private _toggleHighlight(): void {
    this.item.toggleHighlight();
  }

}

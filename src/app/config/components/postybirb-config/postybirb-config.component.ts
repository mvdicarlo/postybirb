import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { GalleryService } from '../../../posty-birb/services/gallery-service/gallery.service';

@Component({
  selector: 'postybirb-config',
  templateUrl: './postybirb-config.component.html',
  styleUrls: ['./postybirb-config.component.css']
})
export class PostybirbConfigComponent {
  @ViewChild('templateSelect') templateSelect: any;
  enableTemplateDelete: boolean;
  selectedTemplate: any;

  constructor(private galleryService: GalleryService) { }

  resetScheduled(): void {
    this.galleryService.clearScheduledSubmissions;
  }

  resetUnscheduled(): void {
    this.galleryService.clearUnscheduledSubmissions();
  }

  resetTemplates(): void {
    store.remove('postybirb-profiles');
  }

  resetAllSettings(): void {
    this.resetScheduled();
    this.resetUnscheduled();
    this.resetTemplates();
    store.remove('postybirb-temp');
  }

  deleteTemplate(): void {
    this.enableTemplateDelete = false;
    const templates = store.get('postybirb-profiles') || [];


    if (this.selectedTemplate) {
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];

        if (template.name === this.selectedTemplate.name) {
          templates.splice(i, 1);
          break;
        }
      }
    }

    store.set('postybirb-profiles', templates);
    this.templateSelect.refresh();
    this.selectedTemplate = null;
  }

  templateSelected(template: any): void {
    this.enableTemplateDelete = true;
    this.selectedTemplate = template;
  }

}

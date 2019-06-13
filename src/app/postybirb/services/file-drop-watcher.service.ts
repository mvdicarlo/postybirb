import { Injectable } from '@angular/core';
import { fromEvent, Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileDropWatcherService {
  private isDragging: boolean = false;

  private dragStateSubject: Subject<boolean> = new Subject();
  public readonly onDragStateChange: Observable<boolean> = this.dragStateSubject.asObservable();

  private dropSubject: Subject<FileList> = new Subject();
  public readonly onDrop: Observable<FileList> = this.dropSubject.asObservable();

  constructor() {
    fromEvent(document, 'drop').subscribe(this.drop.bind(this));
    fromEvent(document, 'dragleave').subscribe(this.dragleave.bind(this));
    fromEvent(document, 'dragenter').subscribe(this.dragenter.bind(this));
  }

  private dragenter(event: DragEvent): void {
    if (event.dataTransfer && event.dataTransfer.items.length) {
      if (!this.isDragging) {
        this.isDragging = true;
        this.dragStateSubject.next(this.isDragging);
      }
    }
  }

  private dragleave(event: DragEvent): void {
    if (!event.fromElement) {
      this.isDragging = false;
      this.dragStateSubject.next(this.isDragging);
    }
  }

  private drop(event: DragEvent): void {
      this.isDragging = false;
      this.dragStateSubject.next(this.isDragging);
    if (event.dataTransfer && event.dataTransfer.files.length) {
      this.dropSubject.next(event.dataTransfer.files);
    }
  }
}

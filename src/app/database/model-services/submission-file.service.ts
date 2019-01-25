import { Injectable } from '@angular/core';
import { DatabaseService } from '../services/database.service';

@Injectable({
  providedIn: 'root'
})
export class SubmissionFileService extends DatabaseService {

  constructor() {
    super();
  }
}

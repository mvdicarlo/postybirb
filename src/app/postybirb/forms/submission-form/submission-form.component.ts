import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Submission } from 'src/app/database/models/submission.model';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';

@Component({
  selector: 'submission-form',
  templateUrl: './submission-form.component.html',
  styleUrls: ['./submission-form.component.css']
})
export class SubmissionForm implements OnInit {
  public submission: Submission;

  public basicInfoForm: FormGroup;

  constructor(
    _route: ActivatedRoute,
    fb: FormBuilder,
    private _submissionCache: SubmissionCache
  ) {
    this.submission = _submissionCache.get(_route.snapshot.paramMap.get('id')); // should be in cache by now hopefully

    this.basicInfoForm = fb.group({

    }, { updateOn: 'blur' });
  }

  ngOnInit() {

  }

}

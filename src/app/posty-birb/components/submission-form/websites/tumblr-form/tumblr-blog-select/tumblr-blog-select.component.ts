import { Component, OnInit, OnDestroy, AfterContentInit, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { WebsiteManagerService } from '../../../../../../commons/services/website-manager/website-manager.service';
import { Subscription } from 'rxjs';
import { SupportedWebsites } from '../../../../../../commons/enums/supported-websites';
import { BaseControlValueAccessorComponent } from '../../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';

@Component({
  selector: 'tumblr-blog-select',
  templateUrl: './tumblr-blog-select.component.html',
  styleUrls: ['./tumblr-blog-select.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TumblrBlogSelectComponent),
      multi: true,
    }
  ]
})
export class TumblrBlogSelectComponent extends BaseControlValueAccessorComponent implements OnInit, OnDestroy, AfterContentInit, ControlValueAccessor {
  private statusSubscription: Subscription;
  public blogs: any[];

  constructor(private service: WebsiteManagerService) {
    super();
  }

  ngOnInit() {
    this.value = undefined;
    this.blogs = [];
  }

  ngAfterContentInit() {
    this.populateBlogs(this.service.getOther(SupportedWebsites.Tumblr));
    this.statusSubscription = this.service.getObserver().subscribe((statuses) => {
      if (statuses[SupportedWebsites.Tumblr]) {
        this.populateBlogs(this.service.getOther(SupportedWebsites.Tumblr));
      }
    });
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
  }

  populateBlogs(info: any): void {
    if (info.blogs && info.blogs.length > 0) {
      this.blogs = info.blogs.map((blog) => {
        return {
          label: blog.name,
          value: blog.name
        };
      });

      if (!this.value) {
        this.value = info.username;
        this.onChange({ value: this.value });
      }
    } else {
      this.blogs = [];
    }
  }

  public writeValue(obj: any) {
    if (obj) {
      this.value = obj;
    }
  }

  public onChange(event: any) {
    const val = event.value;
    this.onChangedCallback(val);
  }
}

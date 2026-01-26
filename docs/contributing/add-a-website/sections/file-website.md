# Support Posting Files

All website implementation that need to post files to their respective websites must
implement the `FileWebsite<T>` interface.

## Sample

```ts
class FooFileSubmission extends BaseWebsiteOptions {
  @TitleField({ 'title', required: true, row: 0, col: 1 })
  title: string;

  @TagField({ row: 2, col: 1 })
  tags: TagValue;

  @DescriptionField({ row: 3, col: 1 })
  description: DescriptionValue;

  @RatingField({ required: true, row: 0, col: 0 })
  rating: SubmissionRating;
}

@WebsiteMetadata({
  name: 'foo',
  displayName: 'Foo',
})
@UserLoginFlow('https://foo.net/login')
@SupportsFiles({
  acceptedMimeTypes: ['image/png', 'image/jpeg'], // Limits to only these mime types
  fileBatchSize: 2,
})
export default class Foo extends Website<FooAccountData> implements FileWebsite<FooFileSubmission> {
  protected BASE_URL = 'https://foo.net';

  createFileModel(): FooFileSubmission {
    return new FooFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    return undefined;
  }

  onPostFileSubmission(postData: PostData<FileSubmission, FooFileSubmission>, files: PostingFile[], batchIndex: number, cancellationToken: CancellableToken): Promise<PostResponse> {
    throw new Error('Method not implemented.');
  }

  async onValidateFileSubmission(postData: PostData<FileSubmission, FooFileSubmission>): Promise<SimpleValidationResult> {
    // Stub
  }
}
```

### Sample Explained

#### FooFileSubmission

The class that you pass into the `FileWebsite<T>` is responsible for the population of data
and fields that users can fill in to customize their submission. You can read more about
how to specify form data [here](./defining-submission-data.md).

The general rule of thumb is to try and emulate most of the options provided to a user
in the actual form.

#### createFileModel

This is the method responsible for returning an object of the generic type passed into
the `FileWebsite` interface. This method is called when a user adds a website into their
submission. In most cases this method will be pretty boiler-plate, but also allows for
the injection of account specific data if needed or convenient on form data creation.

#### calculateImageResize

This method is called just before image files are processed for posting and during
submission validation. This should be used to correct images dimensions or to reduce
overall file size.

#### onPostFileSubmission

This is where the actual logic to submit a submission to any particular website is.
This section will be better filled once a standard pattern has been written across
multiple website implementations.

#### onValidateFileSubmission

This method is where any additional validations can occur that are not fulfilled by
decorator-based validations. You can read more about validations [here](./validation.md).

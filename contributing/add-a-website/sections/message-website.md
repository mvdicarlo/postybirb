# Support Sending Messages

All website implementation that need to post files to their respective websites must
implement the `MessageWebsite<T>` interface.

## Sample

```ts
class FooMessageSubmission implements IWebsiteFormFields {
  @TextField({ label: 'title', required: true, row: 0, col: 1 })
  title: string;

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
export default class Foo extends Website<FooAccountData> implements MessageWebsite<FooMessageSubmission> {
  protected BASE_URL = 'https://foo.net';

  createFileModel(): FooMessageSubmission {
    return new FooMessageSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    return undefined;
  }

  onPostFileSubmission(postData: PostData<FileSubmission, FooMessageSubmission>, files: PostingFile[], batchIndex: number, cancellationToken: CancellableToken): Promise<PostResponse> {
    throw new Error('Method not implemented.');
  }

  async onValidateFileSubmission(postData: PostData<MessageSubmission, FooMessageSubmission>): Promise<SimpleValidationResult> {
    // Stub
  }
}
```

### Sample Explained

#### FooMessageSubmission

The class that you pass into the `MessageWebsite<T>` is responsible for the population of data
and fields that users can fill in to customize their submission. You can read more about
how to specify form data [here](./defining-submission-data.md).

The general rule of thumb is to try and emulate most of the options provided to a user
in the actual form.

#### createMessageModel

This is the method responsible for returning an object of the generic type passed into
the `MessageWebsite` interface. This method is called when a user adds a website into their
submission. In most cases this method will be pretty boiler-plate, but also allows for
the injection of account specific data if needed or convenient on form data creation.

#### onPostMessageSubmission

This is where the actual logic to submit a submission to any particular website is.
This section will be better filled once a standard pattern has been written across
multiple website implementations.

#### onValidateMessageSubmission

This method is where any additional validations can occur that are not fulfilled by
decorator-based validations. You can read more about validations [here](./validation.md).

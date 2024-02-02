import { FormBuilderMetadata } from '@postybirb/form-builder';
import { IFormGenerationRequestDto, SubmissionType } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

class FormGeneratorApi {
  private readonly client: HttpClient = new HttpClient('form-generator');

  getDefaultForm(type: SubmissionType) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.client.get<FormBuilderMetadata<any>>(`default/${type}`);
  }

  getForm(dto: IFormGenerationRequestDto) {
    return this.client.post<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      FormBuilderMetadata<any>
    >('', dto);
  }
}

export default new FormGeneratorApi();

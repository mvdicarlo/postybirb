import { FormBuilderMetadata } from '@postybirb/form-builder';
import { IFormGenerationRequestDto, SubmissionType } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

class FormGeneratorApi {
  private readonly client: HttpClient = new HttpClient('form-generator');

  getDefaultForm(type: SubmissionType) {
    return this.client.get<FormBuilderMetadata>(`default/${type}`);
  }

  getForm(dto: IFormGenerationRequestDto) {
    return this.client.post<FormBuilderMetadata>('', dto);
  }
}

export default new FormGeneratorApi();

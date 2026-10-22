import { FormBuilderMetadata } from '@postybirb/form-builder';
import { FormGenerationRequestDto } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

class FormGeneratorApi {
  private readonly client: HttpClient = new HttpClient('form-generator');

  getForm(dto: FormGenerationRequestDto) {
    return this.client.post<FormBuilderMetadata>('', dto);
  }
}

export default new FormGeneratorApi();

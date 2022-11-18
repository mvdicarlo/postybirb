import { IFormGenerationRequestDto } from '@postybirb/dto';
import { FormBuilderMetadata } from '@postybirb/form-builder';
import Https from '../transports/https';

export default class FormGeneratorApi {
  private static readonly request: Https = new Https('form-generator');

  static getDefaultForm() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return FormGeneratorApi.request.get<FormBuilderMetadata<any>>(
      'default-form'
    );
  }

  static getForm(dto: IFormGenerationRequestDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return FormGeneratorApi.request.post<
      FormBuilderMetadata<any>,
      IFormGenerationRequestDto
    >('', dto);
  }
}

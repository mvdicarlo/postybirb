import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { SUBMISSION_TEMPLATE_UPDATES } from '@postybirb/socket-events';
import { PostyBirbService } from '../common/service/postybirb-service';
import { SubmissionTemplate } from '../database/entities/submission-template.entity';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { DatabaseUpdateSubscriber } from '../database/subscribers/database.subscriber';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { WebsiteOptionsService } from '../website-options/website-options.service';
import { CreateSubmissionTemplateDto } from './dtos/create-submission-template.dto';
import { UpdateSubmissionTemplateDto } from './dtos/update-submission-template.dto';

@Injectable()
export class SubmissionTemplatesService extends PostyBirbService<SubmissionTemplate> {
  constructor(
    dbSubscriber: DatabaseUpdateSubscriber,
    @InjectRepository(SubmissionTemplate)
    repository: PostyBirbRepository<SubmissionTemplate>,
    private readonly websiteOptionsService: WebsiteOptionsService,
    @Optional() webSocket?: WSGateway
  ) {
    super(repository, webSocket);
    repository.addUpdateListener(dbSubscriber, [SubmissionTemplate], () =>
      this.emit()
    );
  }

  protected async emit() {
    super.emit({
      event: SUBMISSION_TEMPLATE_UPDATES,
      data: (await this.repository.findAll()).map((entity) => entity.toJSON()),
    });
  }

  async create(createDto: CreateSubmissionTemplateDto) {
    this.logger.info(createDto, 'Creating Submission Template');

    if (createDto.name.trim().length === 0) {
      throw new BadRequestException('Name must not be empty or whitespace');
    }

    const entity = this.repository.create({
      name: createDto.name,
      type: createDto.type,
    });

    const options = await Promise.all(
      createDto.options.map((option) =>
        this.websiteOptionsService.createSubmissionTemplateOption(entity, {
          account: option.account,
          data: option.data,
        })
      )
    );

    entity.options.add(options);
    await this.repository.persistAndFlush(entity);

    return entity;
  }

  async update(id: string, updateDto: UpdateSubmissionTemplateDto) {
    throw new Error('Method not implemented.');
  }
}

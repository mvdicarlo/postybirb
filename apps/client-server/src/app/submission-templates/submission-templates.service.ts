import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { SUBMISSION_TEMPLATE_UPDATES } from '@postybirb/socket-events';
import { PostyBirbService } from '../common/service/postybirb-service';
import { SubmissionTemplate } from '../database/entities/submission-template.entity';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { DatabaseUpdateSubscriber } from '../database/subscribers/database.subscriber';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateWebsiteOptionsDto } from '../website-options/dtos/create-website-options.dto';
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
    const name = createDto.name?.trim();

    if (name.length === 0) {
      throw new BadRequestException('Name must not be empty or whitespace');
    }

    await this.throwIfExists({
      name,
      type: createDto.type,
    });

    const entity = this.repository.create({
      name,
      type: createDto.type,
    });

    const options = [
      await this.websiteOptionsService.createDefaultSubmissionTemplateOptions(
        entity
      ),
    ];
    entity.options.add(options);
    await this.repository.persistAndFlush(entity);

    return entity;
  }

  async update(id: string, update: UpdateSubmissionTemplateDto) {
    this.logger.info(update, `Updating SubmissionTemplate '${id}'`);
    const entity = await this.findById(id, { failOnMissing: true });

    const name = update.name?.trim();

    // Do not allow rename to same name
    if (entity.name !== name) {
      await this.throwIfExists({
        name,
        type: entity.type,
      });
    }

    if (name) {
      entity.name = name;
    }

    if (entity.options?.length) {
      entity.options.removeAll();
      const options = await this.createTemplateOptions(entity, update.options);
      entity.options.add(options);
    }

    await this.repository.persistAndFlush(entity);
    return entity;
  }

  private createTemplateOptions(
    submissionTemplate: SubmissionTemplate,
    options: CreateWebsiteOptionsDto[]
  ) {
    return Promise.all(
      options.map((option) =>
        this.websiteOptionsService.createSubmissionTemplateOption(
          submissionTemplate,
          {
            account: option.account,
            data: option.data,
          }
        )
      )
    );
  }
}

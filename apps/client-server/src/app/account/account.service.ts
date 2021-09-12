import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DeleteResult, Repository } from 'typeorm';
import { ACCOUNT_REPOSITORY } from '../constants';
import { AccountDto } from './dtos/account.dto';
import { CreateAccountDto } from './dtos/create-account.dto';
import { UpdateAccountDto } from './dtos/update-account.dto';
import { Account } from './entities/account.entity';

@Injectable()
export class AccountService {
  private readonly logger: Logger = new Logger(AccountService.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private accountRepository: Repository<Account>
  ) {}

  /**
   * Creates an Account.
   * @todo Fire off side-effects
   * @param {CreateAccountDto} createAccountDto
   */
  create(createAccountDto: CreateAccountDto): Promise<Account> {
    const account = this.accountRepository.create(createAccountDto);
    this.logger.log(`Creating account - ${JSON.stringify(account)}`);
    return this.accountRepository.save(account);
  }

  /**
   * Returns a list of all Accounts and their associated login state and data.
   * @todo get real website state and data
   */
  findAll(): Promise<AccountDto<Record<string, unknown>>[]> {
    return this.accountRepository.find().then((accounts) => {
      return accounts.map((account) => {
        return {
          ...account,
          loginState: {
            username: null,
            isLoggedIn: false,
          },
          data: {},
        };
      });
    });
  }

  /**
   * Finds an Account matching the Id provided or throws NotFoundException.
   * @todo get real website state and data
   */
  findOne(id: string): Promise<AccountDto<Record<string, unknown>>> {
    return this.accountRepository
      .findOneOrFail(id)
      .then((account) => ({
        ...account,
        loginState: {
          username: null,
          isLoggedIn: false,
        },
        data: {},
      }))
      .catch(() => {
        throw new NotFoundException(id);
      });
  }

  /**
   * Deleted an Account matching the Id provided.
   * @todo cleanup website resources
   */
  async remove(id: string): Promise<DeleteResult> {
    await this.findOne(id);
    this.logger.log(`Deleting account ${id}`);
    return await this.accountRepository.delete(id);
  }

  /**
   * Updates an Account matching the Id provided.
   */
  async update(
    id: string,
    updateAccountDto: UpdateAccountDto
  ): Promise<boolean> {
    const existing = await this.findOne(id);
    this.logger.log(
      `Updating account ${id} - ${JSON.stringify(updateAccountDto)}`
    );
    return await this.accountRepository
      .update(id, updateAccountDto)
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }
}

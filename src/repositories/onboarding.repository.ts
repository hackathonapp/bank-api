import {inject} from '@loopback/core';
import {DefaultKeyValueRepository} from '@loopback/repository';
import {promisify} from 'util';
import {RedisDataSource} from '../datasources';
import {Onboarding} from '../models';

export class OnboardingRepository extends DefaultKeyValueRepository<
  Onboarding
> {
  constructor(@inject('datasources.Redis') dataSource: RedisDataSource) {
    super(Onboarding, dataSource);
  }

  async create(token: string, onboarding: Object, ttl: number) {
    const connector = this.kvModelClass.dataSource!.connector!;
    const execute = promisify((cmd: string, args: any[], cb: Function) => {
      connector.execute!(cmd, args, cb);
    });

    await execute('WATCH', [token]);
    await execute('MULTI', []);
    await this.set(token, onboarding);
    await this.expire(token, ttl);

    const result = await execute('EXEC', []);
    return result == null ? null : onboarding;
  }
}

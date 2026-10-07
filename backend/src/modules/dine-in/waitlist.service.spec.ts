import { ConflictException, NotFoundException } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';

function setup(entry: object | null, claimed: boolean) {
  const repo = {
    findById: jest.fn().mockResolvedValue(entry),
    claimForSeating: jest.fn().mockResolvedValue(claimed),
  };
  return { service: new WaitlistService(repo as never, {} as never), repo };
}

describe('WaitlistService.claimForSeating', () => {
  it('reserves a waiting party for seating', async () => {
    const entry = { id: 'w1', status: 'WAITING' };
    const { service, repo } = setup(entry, true);
    await expect(service.claimForSeating('t', 'w1')).resolves.toBe(entry);
    expect(repo.claimForSeating).toHaveBeenCalledWith('t', 'w1');
  });

  it('refuses a party someone else just seated (no second order)', async () => {
    const { service } = setup({ id: 'w1', status: 'SEATED' }, false);
    await expect(service.claimForSeating('t', 'w1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('404s for an entry outside this business', async () => {
    const { service } = setup(null, false);
    await expect(service.claimForSeating('t', 'w1')).rejects.toThrow(
      NotFoundException,
    );
  });
});

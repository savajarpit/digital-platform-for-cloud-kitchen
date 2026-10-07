import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  it("doesn't inherit CreateUserDto's CUSTOMER role default", () => {
    const dto = plainToInstance(UpdateUserDto, { firstName: 'New' });
    expect(dto.role).toBeUndefined();
  });
});

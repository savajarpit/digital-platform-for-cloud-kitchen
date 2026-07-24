import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate as isUuid } from 'uuid';

@Injectable()
export class ParseUuidPipe implements PipeTransform {
  transform(value: string): string {
    if (!isUuid(value)) {
      throw new BadRequestException(`${value} is not a valid UUID`);
    }
    return value;
  }
}

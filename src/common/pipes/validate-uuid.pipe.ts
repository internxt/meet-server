import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class ValidateUUIDPipe implements PipeTransform<string> {
  transform(value: string, metadata: ArgumentMetadata) {
    if (!value || !isUUID(value))
      throw new BadRequestException(
        `Value of '${metadata.data}' is not a valid UUID.`,
      );
    return value;
  }
}

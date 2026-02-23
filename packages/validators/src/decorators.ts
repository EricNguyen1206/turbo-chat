import { ValidationOptions, registerDecorator } from 'class-validator';

export function IsMongoDbId(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: any, propertyName: string | symbol) {
    registerDecorator({
      name: 'isMongoDbId',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions as ValidationOptions,
      validator: {
        validate(id: string): boolean {
          if (!id || typeof id !== 'string') return false;

          return /^[0-9a-fA-F]{24}$/.test(id);
        },
        defaultMessage(): string {
          return 'Invalid MongoDB ObjectId';
        },
      },
      constraints: [],
    });
  };
}

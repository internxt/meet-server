export type OmitCreateProperties<
  T extends { id: string; createdAt?: Date; updatedAt?: Date },
> = Pick<T, Exclude<keyof T, 'id' | 'createdAt' | 'updatedAt'>>;

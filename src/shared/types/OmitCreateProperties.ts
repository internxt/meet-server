export type OmitCreateProperties<
  T extends {
    id: string | number;
    createdAt?: Date;
    updatedAt?: Date;
  },
> = Pick<T, Exclude<keyof T, 'id' | 'createdAt' | 'updatedAt'>>;

export interface OutputConverter<T> {
    getFormat(): string;
    parse(text: string): T;
}

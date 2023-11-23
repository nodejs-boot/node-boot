export class ConfigCache {
  constructor(private readonly data = {}) {}

  set(key, value) {
    this.data[key] = value;
  }

  get(key) {
    return this.data[key];
  }
}

import {Component} from "@nodeboot/core";

@Component()
export class GreetingService {
    greet(name: string): string {
        return `Hello, ${name}!`;
    }
}

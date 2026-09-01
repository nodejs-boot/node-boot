import {Service} from "@nodeboot/core";

@Service()
export class GreetingService {
    greet(name: string): string {
        return `Hello, ${name}!`;
    }
}

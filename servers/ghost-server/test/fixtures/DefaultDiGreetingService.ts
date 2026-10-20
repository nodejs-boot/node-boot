import {Service} from "@nodeboot/core";

@Service()
export class DefaultDiGreetingService {
    greet(name: string): string {
        return `Hello, ${name}!`;
    }
}

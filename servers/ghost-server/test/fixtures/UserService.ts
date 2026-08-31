import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {GreetingService} from "./GreetingService";

/**
 * Depends on `GreetingService` and the `app-name` bean, to prove DI wiring and `@Bean` injection
 * both work in "pure IoC" mode - `GhostServer` never binds an HTTP layer, so this is the only way
 * to exercise the container from a test.
 */
@Component()
export class UserService {
    @Inject()
    private greetingService: GreetingService;

    @Inject("app-name")
    private appName: string;

    welcome(name: string): string {
        return `${this.greetingService.greet(name)} Welcome to ${this.appName}.`;
    }
}

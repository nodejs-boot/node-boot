import { Component, RequestContext } from "@node-boot/context";
import { CurrentUserResolver } from "@node-boot/authorization";

@Component()
export class LoggedInUserResolver implements CurrentUserResolver {
  async getCurrentUser(context: RequestContext): Promise<any> {
    // Your logic to fetch the current user from the request, database, or any other source
    // For example, you might want to retrieve user info from a session, token, or database
    context.request;
    return {
      id: 1,
      username: "exampleUser"
      // ... other user properties
    };
  }
}

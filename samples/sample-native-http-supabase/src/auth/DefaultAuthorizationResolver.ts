import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {SupabaseClient} from "@supabase/supabase-js";
import {Logger} from "winston";
import {IncomingMessage, ServerResponse} from "node:http";

@Component()
export class DefaultAuthorizationResolver implements AuthorizationChecker<IncomingMessage, ServerResponse> {
    @Inject()
    private logger: Logger;

    @Inject()
    private supabase: SupabaseClient;

    async check(action: Action<IncomingMessage, ServerResponse>, roles: string[]): Promise<boolean> {
        try {
            this.logger.info(`Checking authorization with roles: ${roles.join(", ")}`);

            // Extract the authorization token from request headers
            const authHeader = action.request.headers.authorization;

            if (!authHeader) {
                this.logger.warn("No authorization header provided");
                return false;
            }

            // Extract the token (Bearer token format)
            const token = authHeader.replace("Bearer ", "").trim();

            if (!token) {
                this.logger.warn("Invalid authorization header format");
                return false;
            }

            // Verify the JWT token using Supabase auth
            const {data, error} = await this.supabase.auth.getUser(token);

            if (error || !data.user) {
                this.logger.warn(`User verification failed: ${error?.message || "Unknown error"}`);
                return false;
            }

            // If no roles are required, user is authorized
            if (!roles || roles.length === 0) {
                this.logger.info("No specific roles required, user is authorized");
                return true;
            }

            // Fetch user roles from the profiles table
            const {data: userProfile} = await this.supabase
                .from("profiles")
                .select("roles")
                .eq("id", data.user.id)
                .single()
                .throwOnError();

            const userRoles = userProfile?.roles || [];

            // Check if user has any of the required roles
            const hasRequiredRole = roles.some(role => userRoles.includes(role));

            if (hasRequiredRole) {
                this.logger.info(`User authorized with roles: ${userRoles.join(", ")}`);
                return true;
            }

            this.logger.warn(
                `User does not have required roles. User roles: ${userRoles.join(", ")}, Required: ${roles.join(", ")}`,
            );
            return false;
        } catch (error) {
            this.logger.error(`Error checking authorization: ${error}`);
            return false;
        }
    }
}

import {Action, CurrentUserChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {SupabaseClient} from "@supabase/supabase-js";
import {Logger} from "winston";
import {IncomingMessage, ServerResponse} from "node:http";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<IncomingMessage, ServerResponse> {
    @Inject()
    private logger: Logger;

    @Inject()
    private supabase: SupabaseClient;

    async check(action: Action<IncomingMessage, ServerResponse>): Promise<any> {
        this.logger.info(`Checking current logged in user`);

        try {
            // Extract the authorization token from request headers
            const authHeader = action.request.headers.authorization;

            if (!authHeader) {
                this.logger.warn("No authorization header provided");
                return null;
            }

            // Extract the token (Bearer token format)
            const token = authHeader.replace("Bearer ", "").trim();

            if (!token) {
                this.logger.warn("Invalid authorization header format");
                return null;
            }

            // Verify the JWT token using Supabase auth
            const {data, error} = await this.supabase.auth.getUser(token);

            if (error || !data.user) {
                this.logger.warn(`User verification failed: ${error?.message || "Unknown error"}`);
                return null;
            }

            // Get user details from the authenticated user
            const user = data.user;

            // Optionally fetch additional user profile data if you have a users table
            const {data: userProfile} = await this.supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single()
                .throwOnError();

            const userInfo = {
                id: user.id,
                email: user.email,
                username: user.user_metadata?.["username"] || user.email?.split("@")[0],
                roles: userProfile?.roles || ["USER"],
                ...userProfile,
            };

            this.logger.info(`User verified successfully: ${user.email}`);
            return userInfo;
        } catch (error) {
            this.logger.error(`Error checking logged in user: ${error}`);
            return null;
        }
    }
}

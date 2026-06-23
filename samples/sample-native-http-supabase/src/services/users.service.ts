import {Service} from "@nodeboot/core";
import {CreateUserDto, UpdateUserDto, UserModel} from "../models";
import {SupabaseClient} from "@supabase/supabase-js";
import {Logger} from "winston";
import {HttpError, NotFoundError} from "@nodeboot/error";

@Service()
export class UserService {
    constructor(private readonly logger: Logger, private readonly supabase: SupabaseClient) {}

    public async findAllUser(): Promise<UserModel[]> {
        this.logger.info("Getting all users");
        const {data, error} = await this.supabase.from("profiles").select("*").order("created_at", {ascending: false});

        if (error) {
            this.logger.error("Error fetching users:", error);
            throw new HttpError(500, error.details);
        }

        return data || [];
    }

    public async findUserById(userId: string): Promise<UserModel> {
        this.logger.info(`Getting user with id: ${userId}`);
        const {data, error} = await this.supabase.from("profiles").select("*").eq("id", userId).single();

        if (error) {
            if (error.code === "PGRST116") {
                throw new NotFoundError("User doesn't exist");
            }
            this.logger.error("Error fetching user:", error);
            throw new HttpError(500, "Failed to fetch user");
        }

        if (!data) {
            throw new NotFoundError("User doesn't exist");
        }

        return data;
    }

    public async createUser(userData: CreateUserDto): Promise<UserModel> {
        this.logger.info(`Creating user with email: ${userData.email}`);
        // Check if user already exists
        const {data: existing} = await this.supabase.from("profiles").select("id").eq("email", userData.email).single();

        if (existing) {
            throw new HttpError(409, `This email ${userData.email} already exists`);
        }

        // Create auth user
        const {data: authData, error: authError} = await this.supabase.auth.admin.createUser({
            email: userData.email,
        });

        if (authError || !authData.user) {
            this.logger.error("Error creating auth user:", authError);
            throw new HttpError(400, "Failed to create user");
        }

        // Create profile
        const {data: profile, error: profileError} = await this.supabase
            .from("profiles")
            .insert([
                {
                    id: authData.user.id,
                    email: userData.email,
                    name: userData.name || userData.email.split("@")[0],
                    roles: ["USER"],
                },
            ])
            .select()
            .single();

        if (profileError) {
            this.logger.error("Error creating user profile:", profileError);
            throw new HttpError(400, "Failed to create user profile");
        }

        if (!profile) {
            throw new HttpError(400, "Failed to create user profile");
        }

        return profile;
    }

    public async updateUser(userId: string, userData: UpdateUserDto): Promise<UserModel> {
        this.logger.info(`Updating user with id: ${userId}`);
        // Check user exists
        const {data: user, error: userError} = await this.supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (userError || !user) {
            throw new HttpError(404, "User doesn't exist");
        }

        // Update user
        const {data: updated, error: updateError} = await this.supabase
            .from("profiles")
            .update({
                name: userData.name || user.name,
                email: userData.email || user.email,
            })
            .eq("id", userId)
            .select()
            .single();

        if (updateError || !updated) {
            this.logger.error("Error updating user:", updateError);
            throw new HttpError(400, "Failed to update user");
        }

        return updated;
    }

    public async deleteUser(userId: string): Promise<void> {
        this.logger.info(`Deleting user with id: ${userId}`);
        // Check user exists
        const {data: user, error: userError} = await this.supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (userError || !user) {
            throw new HttpError(404, "User doesn't exist");
        }

        // Delete from profiles first
        const {error: profileError} = await this.supabase.from("profiles").delete().eq("id", userId);

        if (profileError) {
            this.logger.error("Error deleting user profile:", profileError);
            throw new HttpError(400, "Failed to delete user");
        }

        // Delete auth user
        const {error: authError} = await this.supabase.auth.admin.deleteUser(userId);

        if (authError) {
            this.logger.error("Error deleting auth user:", authError);
            throw new HttpError(400, "Failed to delete user");
        }

        this.logger.info("User deleted successfully");
    }
}

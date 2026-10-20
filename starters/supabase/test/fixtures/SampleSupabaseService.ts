import {Service} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {SupabaseClient} from "@supabase/supabase-js";

@Service()
export class SampleSupabaseService {
    constructor(@Inject(SupabaseClient) public readonly supabase: SupabaseClient) {}

    public async getProfiles() {
        const {data, error} = await this.supabase.from("profiles").select("*");
        if (error) throw error;
        return data;
    }

    public async calculateTotal(items: Array<{price: number; quantity: number}>) {
        const {data, error} = await this.supabase.rpc("calculate_total", {items});
        if (error) throw error;
        return data;
    }
}

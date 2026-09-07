import {Repository} from "typeorm";
import {DataRepository} from "@nodeboot/starter-persistence";
import {Todo} from "../entities";

@DataRepository(Todo)
export class TodoRepository extends Repository<Todo> {
    /**
     * Simple full-text-ish search across title, description and tags, used both by the REST
     * API and by the AI tools/knowledge-base so the LLM can ground its answers on real data.
     */
    search(query: string): Promise<Todo[]> {
        const like = `%${query.toLowerCase()}%`;
        return this.createQueryBuilder("todo")
            .where("LOWER(todo.title) LIKE :like", {like})
            .orWhere("LOWER(todo.description) LIKE :like", {like})
            .orWhere("LOWER(todo.tags) LIKE :like", {like})
            .getMany();
    }
}

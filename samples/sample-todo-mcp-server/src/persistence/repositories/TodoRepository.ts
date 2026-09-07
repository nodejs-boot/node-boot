import {Repository} from "typeorm";
import {DataRepository} from "@nodeboot/starter-persistence";
import {Todo} from "../entities";

@DataRepository(Todo)
export class TodoRepository extends Repository<Todo> {
    search(query: string): Promise<Todo[]> {
        const like = `%${query.toLowerCase()}%`;
        return this.createQueryBuilder("todo")
            .where("LOWER(todo.title) LIKE :like", {like})
            .orWhere("LOWER(todo.description) LIKE :like", {like})
            .getMany();
    }
}

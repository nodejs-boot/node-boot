import {Repository} from "typeorm";
import {DataRepository} from "@nodeboot/starter-persistence";
import {Todo} from "../entities";

@DataRepository(Todo)
export class TodoRepository extends Repository<Todo> {}

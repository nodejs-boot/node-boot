import {Service} from "@nodeboot/core";
import {NotFoundError} from "@nodeboot/error";
import {Logger} from "winston";
import {Todo, TodoRepository, TodoPriority} from "../persistence";

export interface CreateTodoInput {
    title: string;
    description?: string;
    priority?: TodoPriority;
}

export interface UpdateTodoInput {
    title?: string;
    description?: string;
    completed?: boolean;
    priority?: TodoPriority;
}

/** Plain CRUD service for Todos, reused by every MCP tool in `TodoMcpToolsService`. */
@Service()
export class TodoService {
    constructor(private readonly logger: Logger, private readonly todoRepository: TodoRepository) {}

    async list(onlyPending = false): Promise<Todo[]> {
        return onlyPending ? this.todoRepository.findBy({completed: false}) : this.todoRepository.find();
    }

    async findById(id: number): Promise<Todo> {
        const todo = await this.todoRepository.findOneBy({id});
        if (!todo) {
            throw new NotFoundError(`Todo ${id} doesn't exist`);
        }
        return todo;
    }

    async create(data: CreateTodoInput): Promise<Todo> {
        this.logger.info(`Creating todo: ${data.title}`);
        return this.todoRepository.save({
            title: data.title,
            description: data.description,
            priority: data.priority ?? "medium",
            completed: false,
        });
    }

    async update(id: number, data: UpdateTodoInput): Promise<Todo> {
        const todo = await this.findById(id);
        return this.todoRepository.save({...todo, ...data});
    }

    async complete(id: number): Promise<Todo> {
        return this.update(id, {completed: true});
    }

    async delete(id: number): Promise<void> {
        await this.findById(id);
        await this.todoRepository.delete({id});
    }

    async search(query: string): Promise<Todo[]> {
        return this.todoRepository.search(query);
    }
}

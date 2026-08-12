import {PostConstruct, Service} from "@nodeboot/core";
import {Todo, TodoRepository} from "../persistence";

const SEED_ROWS = 1000;

@Service()
export class TodoService {
    constructor(private readonly todoRepository: TodoRepository) {}

    /**
     * Seeds the benchmark dataset once, the same way samples/sample-express seeds its Users
     * table on first boot (see UserService), so every benchmark run starts from a known state.
     * Runs on the "persistence.started" lifecycle (before the HTTP server starts listening) so
     * the seed data is guaranteed to exist before the first request is served.
     */
    @PostConstruct()
    async seed(): Promise<void> {
        const existing = await this.todoRepository.count();
        if (existing) return;

        const seed: Partial<Todo>[] = Array.from({length: SEED_ROWS}, (_, i) => ({
            title: `Benchmark todo #${i + 1}`,
            done: (i + 1) % 5 === 0,
        }));
        await this.todoRepository.save(seed);
    }

    findAll(): Promise<Todo[]> {
        return this.todoRepository.find({order: {id: "DESC"}, take: 20});
    }

    findById(id: number): Promise<Todo | null> {
        return this.todoRepository.findOneBy({id});
    }

    async create(title: string): Promise<Todo> {
        const todo = this.todoRepository.create({title: title || "Untitled", done: false});
        return this.todoRepository.save(todo);
    }
}

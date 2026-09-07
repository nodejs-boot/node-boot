import {Repository} from "typeorm";
import {DataRepository} from "../../src";
import {Counter} from "./Counter.entity";

@DataRepository(Counter)
export class CounterRepository extends Repository<Counter> {}

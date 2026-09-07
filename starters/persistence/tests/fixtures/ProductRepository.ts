import {Repository} from "typeorm";
import {DataRepository} from "../../src";
import {Product} from "./Product.entity";

@DataRepository(Product)
export class ProductRepository extends Repository<Product> {}

import {Service} from "@nodeboot/core";
import {Transactional} from "../../src";
import {ProductRepository} from "./ProductRepository";
import {Product} from "./Product.entity";

@Service()
export class ProductService {
    constructor(private readonly productRepository: ProductRepository) {}

    @Transactional()
    async createProduct(name: string): Promise<Product> {
        return this.productRepository.save(this.productRepository.create({name, version: 1}));
    }

    @Transactional()
    async createTwoProductsThenFail(nameA: string, nameB: string): Promise<void> {
        await this.productRepository.save(this.productRepository.create({name: nameA, version: 1}));
        await this.productRepository.save(this.productRepository.create({name: nameB, version: 1}));
        throw new Error("boom - forcing rollback");
    }
}

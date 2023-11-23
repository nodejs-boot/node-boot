import { Inject, Service } from "typedi";
import { User } from "../interfaces/users.interface";
import { UserModel } from "../models/users.model";
import { HttpException } from "../exceptions/httpException";
import { CreateUserDto } from "../dtos/users.dto";
import { Logger } from "winston";
import { ConfigService } from "@node-boot/config";

@Service()
export class UserService {
  constructor(
    private readonly logger: Logger,
    @Inject() private readonly configService: ConfigService
  ) {}

  public async findAllUser(): Promise<User[]> {
    this.logger.info("Getting all users");
    const users: User[] = UserModel;

    const baseUrl = this.configService.getString("backend.baseUrl");
    this.logger.info(`Reading backend.baseUrl from app-config.yam: ${baseUrl}`);
    return users;
  }

  public async findUserById(userId: number): Promise<User> {
    const findUser = UserModel.find((user) => user.id === userId);
    if (!findUser) throw new HttpException(409, "User doesn't exist");
    return findUser;
  }

  public async createUser(userData: CreateUserDto): Promise<User> {
    const findUser = UserModel.find((user) => user.email === userData.email);
    if (findUser)
      throw new HttpException(
        409,
        `This email ${userData.email} already exists`
      );

    return { id: UserModel.length + 1, ...userData };
  }

  public async updateUser(
    userId: number,
    userData: CreateUserDto
  ): Promise<User[]> {
    const findUser = UserModel.find((user) => user.id === userId);
    if (!findUser) throw new HttpException(409, "User doesn't exist");

    return UserModel.map((user: User) => {
      if (user.id === findUser.id) user = { id: userId, ...userData };
      return user;
    });
  }

  public async deleteUser(userId: number): Promise<User[]> {
    const findUser = UserModel.find((user) => user.id === userId);
    if (!findUser) throw new HttpException(409, "User doesn't exist");

    return UserModel.filter((user) => user.id !== findUser.id);
  }
}

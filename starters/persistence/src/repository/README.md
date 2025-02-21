## Pagination and Data Repositories

## **PagingAndSortingRepository (TypeORM)**

A generic repository that provides both `offset-based` and `cursor-based` pagination.
This can be extended by application repositories to support pagination out of the box.

---

### **💡 When to Use Each Pagination Method?**

| Pagination Method                        | When to Use                                                       | Pros                                            | Cons                                                         |
| ---------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| **Offset-based (`findPaginated`)**       | When you need **random access** to pages (e.g., "Jump to page 3") | Easy to implement, works with any dataset       | **Slow for large datasets** (OFFSET makes queries expensive) |
| **Cursor-based (`findCursorPaginated`)** | When you need **efficient infinite scrolling** (e.g., news feeds) | **Fast for large datasets**, no skipped records | Cannot directly jump to arbitrary pages                      |

---

### **🛠 How to Use the Repository?**

To integrate pagination into an entity repository, **extend** `PagingAndSortingRepository`:

### **Step 1: Define an Entity (Example: `User`)**

```typescript
import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn} from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @CreateDateColumn()
    createdAt: Date;
}
```

---

### **Step 2: Create a Repository**

```typescript
import {DataSource} from "typeorm";
import {PagingAndSortingRepository} from "./PagingAndSortingRepository";
import {User} from "../entities/User";
import {DataRepository} from "./DataRepository";

@(DataRepository<User>)
export class UserRepository extends PagingAndSortingRepository<User> {}
```

---

### **Step 3: Using the Repository**

#### **1️⃣ Offset-Based Pagination (Jump to Page)**

```typescript
const userRepository = new UserRepository(AppDataSource);

const result = await userRepository.findPaginated({}, 2, 5, "id", "ASC");
console.log(result);
/* Output:
{
  page: 2,
  pageSize: 5,
  totalItems: 50,
  totalPages: 10,
  data: [ ...users ]
}
*/
```

---

#### **2️⃣ Cursor-Based Pagination (Infinite Scrolling)**

```typescript
const userRepository = new UserRepository(AppDataSource);

// Fetch first page
const firstPage = await userRepository.findCursorPaginated({}, 5);
console.log(firstPage);

/* Output:
{
  pageSize: 5,
  cursor: "2024-02-20T00:00:00.000Z",
  data: [ ...users ]
}
*/

// Fetch next page using cursor
const nextPage = await userRepository.findCursorPaginated({}, 5, firstPage.cursor);
console.log(nextPage);
```

Here’s a well-documented version of your **MongoDB paging repository** with explanations of offset-based and cursor-based pagination. 🚀

---

## **MongoPagingAndSortingRepository (TypeORM & MongoDB)**

A generic MongoDB repository that provides both offset-based and cursor-based pagination.
This can be extended by application repositories to support pagination out of the box.

---

### **💡 When to Use Each Pagination Method?**

| Pagination Method                        | When to Use                                                       | Pros                                            | Cons                                                       |
| ---------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| **Offset-based (`findPaginated`)**       | When you need **random access** to pages (e.g., "Jump to page 3") | Easy to implement, works with any dataset       | **Slow for large datasets** (SKIP makes queries expensive) |
| **Cursor-based (`findCursorPaginated`)** | When you need **efficient infinite scrolling** (e.g., news feeds) | **Fast for large datasets**, no skipped records | Cannot directly jump to arbitrary pages                    |

---

### **🛠 How to Use the Repository?**

To integrate pagination into an entity repository, **extend** `MongoPagingAndSortingRepository`:

#### **Step 1: Define an Entity (Example: `User`)**

```typescript
import {Entity, ObjectIdColumn, Column} from "typeorm";
import {ObjectId} from "mongodb";

@Entity()
export class User {
    @ObjectIdColumn()
    _id: ObjectId;

    @Column()
    name: string;
}
```

---

#### **Step 2: Create a Repository**

```typescript
import {DataSource} from "typeorm";
import {MongoPagingAndSortingRepository} from "./MongoPagingAndSortingRepository";
import {User} from "../entities/User";

export class UserRepository extends MongoPagingAndSortingRepository<User> {
    constructor(dataSource: DataSource) {
        super(User, dataSource);
    }
}
```

---

#### **Step 3: Using the Repository**

##### **1️⃣ Offset-Based Pagination (Jump to Page)**

```typescript
const userRepository = new UserRepository(AppDataSource);

const result = await userRepository.findPaginated({}, 2, 5, "_id", -1);
console.log(result);
/* Output:
{
  page: 2,
  pageSize: 5,
  totalItems: 50,
  totalPages: 10,
  data: [ ...users ]
}
*/
```

---

##### **2️⃣ Cursor-Based Pagination (Infinite Scrolling)**

```typescript
const userRepository = new UserRepository(AppDataSource);

// Fetch first page
const firstPage = await userRepository.findCursorPaginated({}, 5);
console.log(firstPage);

/* Output:
{
  pageSize: 5,
  lastId: "65b3c4f6d4e2a71f1a3b4c9e",
  data: [ ...users ]
}
*/

// Fetch next page using lastId as a cursor
const nextPage = await userRepository.findCursorPaginated({}, 5, firstPage.lastId);
console.log(nextPage);
```

<a name="readme-top"></a>

<br />
<div align="center">
  <h1>Node-Boot Framework</h1>
  <p>We take an opinionated view of the NodeJs platform and third-party libraries so you can get started with minimum fuss.</p>
</div>
<br />

> NOTE: This is fresh, so documentation is under construction. Please be pacient and check our sample projects for examples:
- [Node-Boot with Express](https://github.com/nodejs-boot/node-boot/tree/main/samples/sample-express)
- [Node-Boot with Fastify](https://github.com/nodejs-boot/node-boot/tree/main/samples/sample-fastify)
- [Node-Boot with Koa](https://github.com/nodejs-boot/node-boot/tree/main/samples/sample-koa)

## Node-Boot Architecture
![node-boot-arch drawio](https://github.com/nodejs-boot/node-boot/assets/12997676/42f8256e-b94b-48a6-8375-da41fc9a56e8)


## Documentation
Please Check [Node-Boot Framework Documentation](https://nodeboot-1.gitbook.io/node-boot-framework)


### Built With

This project uses the following technologies and tools:

- [PNPM](https://pnpm.io/) - Package management
- [Turborepo](https://turbo.build/repo) - High performance build system
- [Husky](https://typicode.github.io/husky/) - Git hooks
- [Typescript](https://www.typescriptlang.org/) - Type-safe codebase
- [Prettier](https://prettier.io/) - Code formatter
- [Eslint](https://eslint.org/) - Code linter
- [Nodemon](https://github.com/remy/nodemon) - Development runtime (script monitor)
- [Jest](https://jestjs.io/) - Frontend & backend test suite
- [GitHub Actions](https://github.com/features/actions) - CI/CD workflow automation
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit message standard

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### PNPM

A Fast, disk space efficient package manager with native workspace support. PNPM is a drop-in replacement for [NPM](https://github.com/npm/cli) and [Yarn](https://yarnpkg.com/) (`v1` & `v2`). It's faster than both and uses less disk space. It has a lockfile that is compatible with both NPM and Yarn. With regard to a monorepo, in most cases, it also serves as a replacement for [Lerna](https://lerna.js.org/).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Turborepo

A high-performance build system for monorepos. Turborepo is a replacement for [Lerna](https://lerna.js.org/) and it is mildly faster than Lerna's integrated counterpart [Nx](https://nx.dev/). It also requires less configuration and has less of a learning curve compared to Nx if used independently.

It is worth mentioning, along side Nodemon, you can get the same development experience as if you were working with [Concurrently](https://github.com/open-cli-tools/concurrently) to run multiple development scripts or packages local to the repository.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Husky

A modern Git hooks manager.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Typescript

A superset of JavaScript that compiles to clean JavaScript code. A type-safe coding language and a great tool for large codebases as it helps to prevent bugs and improves code quality.

You will notice 3 `tsconfig.ts` file variants in the root of the project.

- `tsconfig.base.json` - This is the base configuration for all packages within the monorepo. It is worth pointing out that we extend the recommended rules for the current Node LTS version and for strict type-checking from `@tsconfig/node-lts-strictest` ([tsconfig/bases](https://github.com/tsconfig/bases))
- `tsconfig.build.json` - This is the configuration for the build process. It extends the base configuration and configures where the compiled codebase should be outputted to and what should be compiled.
- `tsconfig.json` - This is the configuration for the root of the monorepo mainly for the IDE to use and other libraries that may need it such as Eslint (`@typescript-eslint`). It also extends the base configuration.

Within each `packages/*` directory, you will notice a `tsconfig.json` and `tsconfig.build.json` file. This is for package specific Typescript configuration. It is important in some aspects to treat each package independently from each other as they may have different requirements.

For example, the `tsconfig.build.json` file within a `packages/api` directory may have its `module` option set to `commonjs`. Whereas the `tsconfig.build.json` file within a `packages/frontend` directory might have its `module` option set to `esnext`.

It is worth mentioning, to improve performance, the [incremental](https://www.typescriptlang.org/tsconfig#incremental) option within the `tsconfig.base.json` has been set to `true`. This will cache the results of the last successful compilation and use it to speed up the next compilation.

Another configuration that is worth mentioning, is that the [declaration](https://www.typescriptlang.org/tsconfig#declaration) option has also been set to `true`. This will generate `.d.ts` files for each file within the built `dist` directory. These files separate out the type information from the compiled code resulting in cleaner code output. This is also faster for the packages that depend on them as the compile doesn't have to sift through the code to find the types.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Prettier

An opinionated code formatter.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Eslint

A pluggable and configurable linting tool that statically analyses your code to quickly find problems and can be used to enforce code style.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Nodemon

A monitoring tool that restarts the configured executable when file changes in the configured directory are detected.

Within the `packages/*` directories, you will notice a `nodemode.json` that has an executable script of `exec: pnpm typecheck && pnpm build`. This is to ensure that the codebase is fully type-checked and built - ready for dependants to import. Remember, that the built configuration is only intended for the final built code and not the source code. This form of double Type-checking also quite performant as the Typescript compilation is cached in the form a generate `tsconfig.tsbuildinfo` file thanks to the `incremental: true` Typescript configuration option.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Jest

A delightful JavaScript Testing Framework with a focus on simplicity. Jest is a great tool for testing your codebase and can be used for both frontend and backend code.

As Typescript does all of the type-checking, there's no requirement to use something like `ts-jest` to run our files - we would be type-checking twice. Instead, we can lean on **SWC**, specifically [@swc/jest](https://swc.rs/docs/usage/jest). This is a Jest transformer that uses SWC to compile the Typescript codebase. This is much faster than `ts-jest` and is also a lot more performant than the default Typescript compiler.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Prerequisites

Here's a list of technologies that you will need in order to run this project. We're going to assume that you already have Node.js installed, however, you will need the required version (LTS or v18+) as stated in the `package.json:engines.node` configuration.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### PNPM

If your computer doesn't already have PNPM installed, you can install it by visiting the [PNPM installation](https://pnpm.io/installation) page.

If you're using MacOS, you can install it using Homebrew.

```sh
brew install pnpm
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

#### Node LTS (18)

No you have PNPM installed, you can install the required Node version by running the following command.

```sh
pnpm setup
pnpm add -g n
n lts
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Installation

To install the monorepo and all of its dependancies, simply run the following command at the root of the project.

```sh
pnpm install
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

To run the monorepo and all of its packages, simply run the following command at the root of the project.

```sh
pnpm dev
```

Turborepo and Nodemon will run each package in parallel and watch for file changes.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## How to Start
Check the [Node-Boot Framework Documentation](https://nodeboot-1.gitbook.io/node-boot-framework) to understand the concepts and explore our sample projects where all features are available:

- [Node-Boot with Express](https://github.com/nodejs-boot/node-boot/tree/main/samples/sample-express)
- [Node-Boot with Fastify](https://github.com/nodejs-boot/node-boot/tree/main/samples/sample-fastify)
- [Node-Boot with Koa](https://github.com/nodejs-boot/node-boot/tree/main/samples/sample-koa)

## License

Distributed under the MIT License. See the local `LICENSE` file for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

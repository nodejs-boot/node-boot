# Multi-stage build producing an AWS Lambda container image.
# See: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html
FROM public.ecr.aws/lambda/nodejs:20 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest && corepack enable
COPY . /build
WORKDIR /build

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM public.ecr.aws/lambda/nodejs:20
COPY --from=build /build/dist ${LAMBDA_TASK_ROOT}
COPY --from=build /build/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY --from=build /build/app-config.yaml ${LAMBDA_TASK_ROOT}/app-config.yaml

CMD [ "handler.handler" ]

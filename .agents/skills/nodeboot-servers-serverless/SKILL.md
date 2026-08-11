---
name: nodeboot-servers-serverless
description: Use when the user wants to deploy a Node-Boot application to a serverless/FaaS platform — AWS Lambda, Cloudflare Workers, Vercel, Netlify Functions, or Google Cloud Functions — and needs the router skill that picks the right concrete adapter skill for the target cloud or hosting platform.
---

# Node-Boot Serverless Adapters

> No repo yet? Decide simple-repo vs. monorepo first — see
> [`../nodeboot-project-type/SKILL.md`](../nodeboot-project-type/SKILL.md).

Pick the concrete skill by deployment target:

| Platform               | Use when                                                                                                 | Open next                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| AWS Lambda             | The app should run on AWS behind Lambda + API Gateway or a Lambda Function URL.                          | [`../nodeboot-server-lambda/SKILL.md`](../nodeboot-server-lambda/SKILL.md)                                 |
| Cloudflare Workers     | The app should run in Cloudflare's Fetch API / Workers isolate runtime.                                  | [`../nodeboot-server-cloudflare/SKILL.md`](../nodeboot-server-cloudflare/SKILL.md)                         |
| Vercel                 | The app should ship as a Vercel Node.js Serverless Function under `api/[...path].ts`.                    | [`../nodeboot-server-vercel/SKILL.md`](../nodeboot-server-vercel/SKILL.md)                                 |
| Netlify Functions      | The app should run as a Netlify Function with a `netlify.toml` rewrite for `/api/*`.                     | [`../nodeboot-server-netlify/SKILL.md`](../nodeboot-server-netlify/SKILL.md)                               |
| Google Cloud Functions | The app should run as a Google Cloud Functions gen2 HTTP function registered with `functions.http(...)`. | [`../nodeboot-server-google-cloud-functions/SKILL.md`](../nodeboot-server-google-cloud-functions/SKILL.md) |

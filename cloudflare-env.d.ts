// Import only binding types so Workers runtime globals do not replace browser DOM types.
type Fetcher = import("@cloudflare/workers-types").Fetcher;
declare namespace Cloudflare {
  interface Env {
    // Optional template binding: production configs currently have no D1 database.
    DB?: import("@cloudflare/workers-types").D1Database;
  }
}
declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}

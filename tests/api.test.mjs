import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const source=await readFile(new URL("../app/api.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {api,resolveApiBaseUrl}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const params=new URLSearchParams({q:"old order",page:"3",page_size:"25"});
test("admin list requests carry server search/pagination and abort signal",async()=>{
 const original=globalThis.fetch;const controller=new AbortController();
 try{globalThis.fetch=async(url,options)=>{assert.match(url,/q=old\+order&page=3&page_size=25/);assert.equal(options.signal,controller.signal);assert.equal(options.cache,"no-store");assert.equal(options.headers.get("Authorization"),"Bearer isolated-test");return Response.json({ok:true,data:{items:[],pagination:{page:3,page_size:25,total_items:0,total_pages:0,has_previous:true,has_next:false}}})};const result=await api.list("isolated-test","/v1/orders",params,controller.signal);assert.equal(result.pagination.page,3)}finally{globalThis.fetch=original}
});
test("network, malformed and provider failures are recoverable without exposing internals",async()=>{
 const original=globalThis.fetch;
 try{for(const response of [()=>{throw new Error("secret-token SQL internal")},()=>Response.json(null),()=>Response.json({ok:true,data:{items:[]}}),()=>new Response("not json"),()=>Response.json({ok:false,error:{code:"SQL_SECRET",message:"secret-token SQL internal"}},{status:503})]){globalThis.fetch=async()=>response();await assert.rejects(api.list("isolated-test","/v1/orders",params),error=>Boolean(error.message)&&!error.message.includes("secret-token")&&!error.message.includes("SQL"))}}finally{globalThis.fetch=original}
});
test("production builds cannot fall back to a localhost API",()=>{const old=process.env.NODE_ENV;try{process.env.NODE_ENV="production";assert.equal(resolveApiBaseUrl("localhost"),"https://api.cucsupply.com");assert.equal(resolveApiBaseUrl("127.0.0.1"),"https://api.cucsupply.com")}finally{process.env.NODE_ENV=old}});

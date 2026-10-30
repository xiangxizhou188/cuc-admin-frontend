"use client";
import {useCallback,useEffect,useState} from "react";
import {api,type ApiPage} from "./api";
export function useAdminList<T>(token:string,path:string,enabled:boolean){
 const [filters,setFilters]=useState({q:"",status:"",from:"",to:"",page:1,page_size:25});
 const [search,setSearch]=useState("");const [data,setData]=useState<ApiPage<T>|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(""),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const timer=setTimeout(()=>setFilters(value=>value.q===search?value:{...value,q:search,page:1}),300);return()=>clearTimeout(timer)},[search]);
 const query=new URLSearchParams(Object.entries(filters).filter(([,v])=>v!=="").map(([k,v])=>[k,String(v)])).toString();
 useEffect(()=>{if(!enabled)return;const controller=new AbortController();setLoading(true);setError("");setData(null);void api.list<T>(token,path,new URLSearchParams(query),controller.signal).then(value=>{if(!controller.signal.aborted)setData(value)}).catch(()=>{if(!controller.signal.aborted)setError("无法加载列表，请重试。")}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[token,path,query,enabled,attempt]);
 const reload=useCallback(()=>setAttempt(value=>value+1),[]);
 const change=(key:"status"|"from"|"to"|"page_size",value:string)=>setFilters(current=>({...current,[key]:key==="page_size"?Number(value):value,page:1}));
 return {filters,search,setSearch,data,loading:loading||search!==filters.q,error,reload,change,setPage:(page:number)=>setFilters(current=>({...current,page}))};
}
export type AdminListState<T>=ReturnType<typeof useAdminList<T>>;
export function ListControls<T>({list,statuses=[],dates=false,statusLabels={},searchPlaceholder}:{list:AdminListState<T>;statuses?:string[];dates?:boolean;statusLabels?:Record<string,string>;searchPlaceholder?:string}){
 return <div className="list-controls"><label>搜索<input type="search" placeholder={searchPlaceholder} value={list.search} onChange={event=>list.setSearch(event.target.value)}/></label>{statuses.length>0&&<label>状态<select value={list.filters.status} onChange={event=>list.change("status",event.target.value)}><option value="">全部状态</option>{statuses.map(value=><option key={value} value={value}>{statusLabels[value] ?? value}</option>)}</select></label>}{dates&&<><label>开始日期<input type="date" value={list.filters.from} onChange={event=>list.change("from",event.target.value)}/></label><label>结束日期<input type="date" value={list.filters.to} onChange={event=>list.change("to",event.target.value)}/></label></>}<label>每页<select value={list.filters.page_size} onChange={event=>list.change("page_size",event.target.value)}>{[25,50,100].map(value=><option key={value}>{value}</option>)}</select></label></div>;
}
export function ListStatus<T>({list}:{list:AdminListState<T>}){
 if(list.loading)return <p role="status">正在加载…</p>;
 if(list.error)return <p role="alert">{list.error} <button onClick={list.reload}>重试</button></p>;
 if(list.data&&!list.data.items.length)return <p role="status">没有匹配记录。{list.filters.page>1&&<button onClick={()=>list.setPage(1)}>返回第一页</button>}</p>;
 return null;
}
export function ListPagination<T>({list}:{list:AdminListState<T>}){
 const page=list.data?.pagination;if(!page||list.loading||list.error)return null;
 return <nav className="list-pagination" aria-label="列表分页"><span>共 {page.total_items} 条 · 第 {page.page} / {Math.max(1,page.total_pages)} 页</span><button disabled={!page.has_previous} onClick={()=>list.setPage(page.page-1)}>上一页</button><button disabled={!page.has_next} onClick={()=>list.setPage(page.page+1)}>下一页</button></nav>;
}

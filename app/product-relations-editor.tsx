"use client";
import {useEffect,useState} from "react";
import {api,type ApiProduct} from "./api";
import {useAdminList} from "./admin-list";

export function ProductRelationsEditor({token,productId,ids,onChange}:{token:string;productId:string;ids:string[];onChange:(ids:string[])=>void}){
  const list=useAdminList<ApiProduct>(token,"/v1/products",true);
  const [names,setNames]=useState<Record<string,string>>({});
  const idKey=ids.join(",");
  useEffect(()=>{
    let active=true;
    void Promise.all(ids.map(async id=>{try{const product=await api.product(token,id);return [id,`${product.name} · ${product.sku}`] as const}catch{return [id,`商品 ${id}（无法加载，可移除）`] as const}})).then(entries=>{if(active)setNames(Object.fromEntries(entries))});
    return()=>{active=false};
  },[token,idKey]);
  return <section className="editor-card product-relations-editor"><h3>关联产品</h3><p className="editor-help">可跨分类选择最多 3 个商品，按选择顺序展示在加入购物车面板。仅已上架商品对顾客可见；未设置时使用同二级分类推荐。</p>
    {ids.length>0&&<ul className="related-selection">{ids.map(id=><li key={id}><span>{names[id]??list.data?.items.find(product=>product.id===id)?.name??id}</span><button type="button" onClick={()=>onChange(ids.filter(value=>value!==id))} aria-label={`移除关联 ${names[id]??id}`}>移除</button></li>)}</ul>}
    <label><span>搜索商品名称、SKU 或品牌</span><input type="search" value={list.search} onChange={event=>list.setSearch(event.target.value)}/></label>{list.loading&&<p role="status">正在加载…</p>}{list.error&&<p role="alert">{list.error} <button type="button" onClick={list.reload}>重试</button></p>}{!list.loading&&!list.error&&list.data&&!list.data.items.length&&<p>没有匹配记录。</p>}
    {!list.loading&&!list.error&&<div className="related-candidates">{list.data?.items.filter(product=>product.id!==productId&&!ids.includes(product.id)).map(product=><label className="check-label" key={product.id}><input type="checkbox" checked={false} disabled={ids.length>=3} onChange={()=>onChange([...ids,product.id])}/><span>{product.name}<small>{product.sku} · {product.status==="published"?"已上架":product.status==="draft"?"草稿":"已下架"}</small></span></label>)}</div>}
    {list.data&&!list.loading&&!list.error&&<nav className="list-pagination" aria-label="关联商品分页"><span>共 {list.data.pagination.total_items} 条 · 第 {list.data.pagination.page} / {Math.max(1,list.data.pagination.total_pages)} 页</span><button type="button" disabled={!list.data.pagination.has_previous} onClick={()=>list.setPage(list.data!.pagination.page-1)}>上一页</button><button type="button" disabled={!list.data.pagination.has_next} onClick={()=>list.setPage(list.data!.pagination.page+1)}>下一页</button></nav>}
  </section>;
}

"use client";
import { useEffect, useRef, useState } from "react";
import { request,ApiClientError } from "./api";
import "./order-shipping.css";
type Piece={orderItemId:string;sku:string;pcs:number;actual:number;length:number;width:number;height:number};
type Shipment={status:string;reference_no:string;tracking_number:string;label_url:string;error_code:string;cost_cents:number;channel_name:string};
type Detail={testMode?:boolean;orderNumber:string;customerShippingCents:number;address:{name:string;phone:string;line1:string;line2:string;city:string;state:string;zip:string};origin:string;canShip:boolean;pieces:Piece[];shipment:Shipment|null};
type Channel={code:string;name:string;carrier:string};
type Quote={quoteId:string;channelName:string;costCents:number;expiresAt:number;isRemote:boolean};
const labels:Record<string,string>={submitting:"提交中",unknown:"结果待核查，请刷新或联系物流商，切勿重复下单",pending:"正在生成面单",failed:"预报失败，请联系物流商核查",label_ready:"面单已就绪（不代表已发货）"};
const errors:Record<string,string>={OIS_NOT_CONFIGURED:"物流 API 尚未完成配置。",OIS_AUTH_FAILED:"物流账号验证失败，请核对 Cloudflare 配置。",OIS_MODE_MISMATCH:"物流环境与订单支付环境不匹配。",OIS_REJECTED:"物流商未接受请求，请核对渠道、地址或联系物流商。",OIS_UNAVAILABLE:"物流服务暂时不可用。已生成的面单仍可查看；结果待核查时请勿重复下单。",NO_SHIPPING_RATES:"没有有效报价，请核对普通快递渠道、收件地址和箱规。",SHIPPING_QUOTE_EXPIRED:"报价已过期或订单已变更，请重新试算。",SHIPPING_ORDER_BLOCKED:"此订单的支付或履约状态不允许生成面单。",SHIPPING_PACKAGES_REQUIRED:"请填写有效的每箱重量、尺寸和箱数。",SHIPPING_REFRESH_LIMIT:"请间隔至少 5 秒刷新。",SHIPPING_ADDRESS_REQUIRED:"订单缺少完整收件地址或电话，请先核对。",SHIPPING_ADDRESS_TOO_LONG:"地址二有值时，两行地址均不得超过 35 字符。"};
function message(reason:unknown){return reason instanceof ApiClientError?(errors[reason.code]??`${reason.message}（${reason.code}）`):"操作失败，请重试。";}
export function OrderShipping({token,orderId,onClose}:{token:string;orderId:string;onClose:()=>void}){
 const [detail,setDetail]=useState<Detail|null>(null),[channels,setChannels]=useState<Channel[]>([]),[channel,setChannel]=useState(""),[pieces,setPieces]=useState<Piece[]>([]),[quote,setQuote]=useState<Quote|null>(null),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[loadAttempt,setLoadAttempt]=useState(0);
 const dialog=useRef<HTMLDivElement>(null);
 const path=`/v1/admin/orders/${encodeURIComponent(orderId)}/shipping`;
 useEffect(()=>{let active=true;const previous=document.activeElement as HTMLElement|null;dialog.current?.focus();setBusy(true);setError("");
 void request<Detail>(path,{},token).then(async data=>{
  if(!active)return;setDetail(data);setPieces(data.pieces);
  if(data.canShip&&!data.shipment){const result=await request<{channels:Channel[]}>("/v1/admin/shipping/channels",{},token);if(active)setChannels(result.channels);}
 }).catch(reason=>{if(active)setError(message(reason))}).finally(()=>{if(active)setBusy(false)});
 return()=>{active=false;previous?.focus()};
 },[path,token,loadAttempt]);
 async function post<T>(action:string,body:unknown){return request<T>(`${path}/${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},token);}
 async function run(action:()=>Promise<void>){if(busy)return;setBusy(true);setError("");try{await action()}catch(reason){setError(message(reason))}finally{setBusy(false)}}
 const editable=detail?.canShip&&!detail.shipment;
 return <div className="modal-overlay"><div className="panel order-shipping" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="shipping-dialog-title" onKeyDown={event=>{if(event.key==="Escape"&&!busy){event.preventDefault();onClose()}if(event.key==="Tab"){const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')??[]),first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}}}>
 <header><h2 id="shipping-dialog-title">物流与面单 {detail?.orderNumber}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="关闭物流面板">关闭</button></header>
 <p>客户配送费：<strong>{detail?detail.customerShippingCents===0?"$0.00 · 包邮":`$${(detail.customerShippingCents/100).toFixed(2)}`:"正在读取订单…"}</strong>。下方为 CUC 承担的物流成本。</p>
 {error&&<div role="alert" className="shipping-error"><p>{error}</p><button type="button" disabled={busy} onClick={()=>{setQuote(null);setConfirmed(false);setLoadAttempt(value=>value+1)}}>重新加载</button></div>}{busy&&<p role="status">正在处理，请稍候…</p>}
 {detail&&<>{detail.testMode&&<p role="status">测试订单 · 使用测试物流配置，面单不可用于实际寄件。</p>}<section><h3>发货与收件信息</h3><p>发货仓：{detail.origin}</p><p>收件：{detail.address.name} · {detail.address.phone}<br/>{detail.address.line1} {detail.address.line2}<br/>{detail.address.city}, {detail.address.state} {detail.address.zip}</p><small>渠道必须已由物流商配置为此发货仓。面单生成后请核对寄件地址。</small></section>
 {!detail.canShip&&!detail.shipment&&<p>请先确认付款和订单处理状态；退款、争议或已发货订单不能创建新面单。</p>}
 {detail.shipment?<section><h3>{labels[detail.shipment.status]??detail.shipment.status}</h3><p>渠道：{detail.shipment.channel_name} · 试算成本 ${(detail.shipment.cost_cents/100).toFixed(2)}</p><p>参考编号：{detail.shipment.reference_no}</p>{detail.shipment.tracking_number&&<p>物流单号：{detail.shipment.tracking_number}</p>}{detail.shipment.error_code&&<p>物流状态代码：{detail.shipment.error_code}</p>}<div className="shipping-actions"><button disabled={busy} onClick={()=>void run(async()=>setDetail(await post<Detail>("refresh",{})))}>核查面单结果</button>{detail.shipment.label_url&&<a href={detail.shipment.label_url} target="_blank" rel="noopener noreferrer">{detail.testMode?"打开 / 打印测试面单 ↗":"打开 / 打印 PDF 面单 ↗"}</a>}</div><p>生成面单不会自动标记已发货。请在承运商实际接收包裹后更新订单履约状态。</p></section>:<>
 <label>普通快递渠道<select disabled={!editable||busy} value={channel} onChange={event=>{setChannel(event.target.value);setQuote(null);setConfirmed(false)}}><option value="">请选择账号已授权的普通快递渠道</option>{channels.map(item=><option key={item.code} value={item.code}>{item.carrier} · {item.name} ({item.code})</option>)}</select></label>
 <p>每个 SKU 独立包装；重量为每箱重量（KG），尺寸为外箱尺寸（CM）。相同箱规可填写多箱，请核对实物。</p>
 <div className="table-wrap"><table><thead><tr><th>SKU</th><th>箱数</th><th>每箱 KG</th><th>长 CM</th><th>宽 CM</th><th>高 CM</th></tr></thead><tbody>{pieces.map((piece,index)=><tr key={piece.orderItemId}><td>{piece.sku}</td>{(["pcs","actual","length","width","height"] as const).map(key=><td key={key}><input aria-label={`${piece.sku} ${key}`} disabled={!editable||busy} required type="number" min={key==="pcs"?1:key==="actual"?0.001:0.1} max="999" step={key==="pcs"?1:key==="actual"?0.001:0.1} value={piece[key]||""} onChange={event=>{setPieces(current=>current.map((value,i)=>i===index?{...value,[key]:Number(event.target.value)}:value));setQuote(null);setConfirmed(false)}}/></td>)}</tr>)}</tbody></table></div>
 <button disabled={!editable||busy||!channel||pieces.length===0||pieces.some(piece=>[piece.pcs,piece.actual,piece.length,piece.width,piece.height].some(value=>value<=0))} onClick={()=>void run(async()=>{setQuote(await post<Quote>("quote",{channelCode:channel,pieces}));setConfirmed(false)})}>查询物流成本</button>
 {quote&&<section className="shipping-quote"><h3>{quote.channelName}</h3><strong>预计物流成本 ${(quote.costCents/100).toFixed(2)} USD</strong>{quote.isRemote&&<p>此地址被物流商标记为偏远地址。</p>}<p>本次试算可用于确认至 {new Date(quote.expiresAt).toLocaleTimeString()}。最终账单可能受复称、箱规或附加费影响；客户配送费不因本次试算而改变。</p><label className="shipping-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/>{detail.testMode?"我已核对收件地址和箱规，确认生成测试运单。":"我已核对渠道发货仓、收件地址、实测箱规与费用；确认后将向正式物流商提交运单，可能产生物流费用。"}</label><button disabled={!editable||busy||!confirmed} onClick={()=>void run(async()=>{setDetail(await post<Detail>("confirm",{quoteId:quote.quoteId,confirm:true}));setQuote(null)})}>确认并生成面单</button></section>}
 </>}
 </>}
 </div></div>;
}

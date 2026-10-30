"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {request} from "./api";
import type {Dashboard} from "./sales-tax-management";
import "./sales-tax-management.css";

type StripeSettings={mode:string;checkedAt:string;status:string;defaultTaxCode:string|null;headOfficeCountry:string|null;headOfficeState:string|null;missingFields:string[];monitoringApiAvailable:false};
const monitoringUrl="https://dashboard.stripe.com/tax/locations?primary_tab=needs_attention";
const money=(cents:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);
export function SalesTaxMonitor({token,onReview}:{token:string;onReview:()=>void}){
 const [data,setData]=useState<Dashboard|null>(null),[stripe,setStripe]=useState<StripeSettings|null>(null),[error,setError]=useState(""),[stripeError,setStripeError]=useState(""),[busy,setBusy]=useState(false),[query,setQuery]=useState("");
 const requestNumber=useRef(0);
 const load=useCallback(async()=>{
  const current=++requestNumber.current;setBusy(true);setError("");setStripeError("");setStripe(null);
  await Promise.all([
   request<Dashboard>("/v1/admin/sales-tax",{cache:"no-store"},token).then(value=>{if(current===requestNumber.current)setData(value)}).catch(e=>{if(current===requestNumber.current){setData(null);setError(e.message)}}),
   request<StripeSettings>("/v1/admin/sales-tax/stripe-settings",{cache:"no-store"},token).then(value=>{if(current===requestNumber.current)setStripe(value)}).catch(e=>{if(current===requestNumber.current)setStripeError(e.message)})
  ]);if(current===requestNumber.current)setBusy(false);
 },[token]);
 useEffect(()=>{void load();return()=>{requestNumber.current++}},[load]);
 const rows=data?.states.filter(row=>`${row.state} ${row.name} ${row.status}`.toLowerCase().includes(query.toLowerCase()))??[];
 const active=data?.states.filter(row=>row.collectionStatus==="Active").length;
 const reviewed=data?.states.filter(row=>row.review&&row.review.physical_status!=="unknown").length;
 return <section className="tax-manager tax-monitor">
  <div className="tax-heading"><div><p className="tax-eyebrow">UNITED STATES · {data?.mode.toUpperCase()??"LOADING"}</p><h2>全美税务监控</h2><p>本站销售、实际登记与待办。Stripe 官方经济门槛监控在其控制台查看。</p></div><div className="tax-actions"><button disabled={busy} onClick={()=>void load()}>{busy?"读取中…":"刷新数据"}</button><button onClick={onReview}>登记与义务审核</button><a className="outline-button" href={monitoringUrl} target="_blank" rel="noreferrer">Stripe 官方全美监控 ↗</a></div></div>
  {error&&<p role="alert" className="tax-error">本站统计读取失败：{error}。请刷新重试。</p>}
  <div className="tax-summary">
   {[["覆盖地区",data?`${data.states.length} 个地区`:"—"],["已审核实体联系",data?reviewed:"—"],["收税配置生效",data?active:"—"],["高优先级预警",data?data.alerts.filter(alert=>alert.severity==="high").length:"—"]].map(([label,value])=><article key={label}><span>{label}</span><strong>{value}</strong></article>)}
  </div>
  <section className="tax-panel"><h3>Stripe Tax · API 实时状态</h3>
   {stripeError?<p role="alert">暂未取得 Stripe 状态：{stripeError}。以下本站统计不受影响；不能将读取失败视为未启用。</p>:stripe?<><div className="tax-connection-grid"><div><small>税务计算设置</small><strong>{stripe.status==="active"?"已配置计算":stripe.status==="pending"?"设置待完善":stripe.status}</strong></div><div><small>税务总部所在地</small><strong>{[stripe.headOfficeState,stripe.headOfficeCountry].filter(Boolean).join(" · ")||"未配置"}</strong></div><div><small>默认商品税码</small><strong>{stripe.defaultTaxCode||"未配置"}</strong></div><div><small>API 读取时间</small><strong>{new Date(stripe.checkedAt).toLocaleString()}</strong></div></div>{stripe.missingFields.length>0&&<p role="alert">Stripe 提示缺少：{stripe.missingFields.join("、")}</p>}<p>“已配置计算”只表示 Tax 设置就绪，不代表已登记所有地区，也不代表已确认没有税务义务。</p></>:<p role="status">正在从 Stripe 读取设置…</p>}
   <p>登记同步：{data?.registrationSyncedAt?new Date(Number(data.registrationSyncedAt)).toLocaleString():"尚未取得同步记录"}。登记明细来自 Stripe Registration API；同步不会创建登记。</p>
   <div className="tax-notice"><b>经济门槛进度：需在 Stripe 官方控制台查看。</b><br/>目前公开 API 未提供该面板的门槛进度。本页不会把本站统计冒充 Stripe 监控结果；未知规则显示“待审核”，不显示虚假的 0% 或“无需登记”。Stripe 监控可能存在更新延迟，实体联系和供应商代发仍需单独确认。<br/><a href="https://docs.stripe.com/tax/monitoring" target="_blank" rel="noreferrer">查看 Stripe 监控说明 ↗</a></div>
  </section>
  <section className="tax-panel"><h3>当前待办</h3>{data?<><p>待审核 {data.states.filter(row=>row.status==="Needs Review").length} 个地区；已暂停结账 {data.states.filter(row=>row.paused).length} 个地区。没有预警不等于没有义务。</p>{data.alerts.filter(alert=>!alert.acknowledged_at).map(alert=><article className={`tax-alert ${alert.severity}`} key={`${alert.state}:${alert.reason}`}><b>{alert.state} · {alert.reason}</b><span>{alert.message}</span></article>)}<p>税务预警邮件：{data.alertEmail||"未配置"}。{data.emailSendingAvailable?"发送绑定可用":"发送绑定不可用"}；实际投递记录在销售税管理中查看。</p></>:<p>等待本站统计。</p>}</section>
  <div className="tax-table-heading"><h3>各州销售与登记</h3><input aria-label="监控页筛选州" placeholder="搜索州、州名或状态…" value={query} onChange={event=>setQuery(event.target.value)}/></div>
  <p className="tax-monitor-caption">数据来源：CUC 本站已付款订单，以收货州归属。各州统计周期见表格；不采用人工全渠道覆盖值。销售总额不等于各州的法定门槛口径，不能据此自动认定需要或无需登记。</p>
  {data&&<div className="tax-table"><table><thead><tr>{["州 / 地区","本站本期销售","本站前期销售","Stripe 登记快照","本站参考门槛","义务审核 / 收税状态"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.state}><td><b>{row.state}</b><small>{row.name}</small></td><td>{money(row.localMetrics.currentSales)}<small>{row.localMetrics.currentCount} 笔 · {row.window.start.slice(0,10)} → {row.window.end.slice(0,10)}</small></td><td>{money(row.localMetrics.previousSales)}<small>{row.localMetrics.previousCount} 笔 · {row.window.previousStart.slice(0,10)} → {row.window.previousEnd.slice(0,10)}</small></td><td>{row.registrations.length?row.registrations.map(registration=><small key={registration.id}>{registration.status} · {registration.id}</small>):"同步记录中无登记"}</td><td>{row.rule?<><a href={row.rule.sourceUrl} target="_blank" rel="noreferrer">{row.rule.comparison==="gt"?">":"≥"} {row.rule.amountCents?money(row.rule.amountCents):""}{row.rule.transactions?` ${row.rule.amountCents?row.rule.operator.toUpperCase():""} ${row.rule.transactions} 笔`:""} ↗</a><small>{row.ruleFresh?"参考规则有效":"参考规则待复核"} · 非 Stripe 进度</small></>:"待审核 · 不推定为无需登记"}</td><td><span className={`tax-status ${row.paused?"danger":""}`}>{row.status}</span><small>{row.collectionStatus}</small></td></tr>)}</tbody></table>{rows.length===0&&<p>没有符合筛选条件的州。</p>}</div>}
 </section>;
}

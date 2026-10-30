"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, ArrowRight, Calculator, CheckCircle, FilePdf, Info, MapPin, Package, Truck, User, Warehouse, WarningCircle, X } from "@phosphor-icons/react";
import { request, ApiClientError } from "./api";
import { packageFields, packageFieldLabels, shippingPackageIssues, validPackageField, type ShippingPiece } from "./order-shipping-state";
import "./order-shipping.css";
import {packageDisplay,packageMetric} from "./shipping-units";

type Shipment = {status:string;reference_no:string;tracking_number:string;label_url:string;error_code:string;cost_cents:number;channel_name:string};
type Detail = {testMode?:boolean;orderNumber:string;customerShippingCents:number;address:{name:string;phone:string;line1:string;line2:string;city:string;state:string;zip:string};origin:string;canShip:boolean;blockReason?:string|null;pieces:ShippingPiece[];shipment:Shipment|null};
type Channel = {code:string;name:string;carrier:string};
type Quote = {quoteId:string;channelName:string;costCents:number;expiresAt:number;isRemote:boolean};
const labels:Record<string,string> = {submitting:"正在提交运单",unknown:"出单结果待核查",pending:"正在生成面单",failed:"物流预报失败",label_ready:"面单已就绪"};
const errors:Record<string,string> = {
  OIS_NOT_CONFIGURED:"物流 API 尚未完成配置，请联系管理员。",OIS_AUTH_FAILED:"物流账号验证失败，请联系管理员检查配置。",
  OIS_MODE_MISMATCH:"物流环境与订单支付环境不匹配。",OIS_REJECTED:"物流商未接受请求，请核对渠道、地址或联系物流商。",
  OIS_UNAVAILABLE:"物流服务暂时不可用。结果待核查时请勿重复下单。",OIS_INVALID_RESPONSE:"物流服务返回内容异常，请稍后重试或联系物流商。",
  NO_SHIPPING_RATES:"未获取到有效报价，请核对渠道、收件地址和箱规。",SHIPPING_QUOTE_EXPIRED:"报价已过期或订单已变更，请重新查询物流成本。",
  SHIPPING_ORDER_BLOCKED:"订单当前的付款或履约状态不允许生成面单。",SHIPPING_PACKAGES_REQUIRED:"请填写有效的每箱重量、尺寸和箱数。",
  SHIPPING_REFRESH_LIMIT:"请间隔至少 5 秒再核查。",SHIPPING_ADDRESS_REQUIRED:"订单缺少完整收件地址或电话，请先核对。",
  SHIPPING_ADDRESS_TOO_LONG:"地址二有值时，两行地址均不得超过 35 字符。",SHIPPING_QUOTE_REQUIRED:"超过 20 箱请联系物流商人工确认。",
  SHIPPING_COUNTRY_UNSUPPORTED:"目前仅支持美国境内普通快递。",FREIGHT_QUOTE_REQUIRED:"订单包含需人工货运报价的商品。",
  SHIPPING_CHANNEL_INVALID:"请选择账号已授权的物流渠道。",
};
function message(reason:unknown) { return reason instanceof ApiClientError ? errors[reason.code] ?? `${reason.message}（${reason.code}）` : "操作失败，请重试。"; }
const money = (cents:number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);

export function OrderShipping({token,orderId,onClose}:{token:string;orderId:string;onClose:()=>void}) {
  const [detail,setDetail] = useState<Detail|null>(null);
  const [pieces,setPieces] = useState<ShippingPiece[]>([]);
  const [channels,setChannels] = useState<Channel[]>([]),[channel,setChannel] = useState("");
  const [loading,setLoading] = useState(true),[channelLoading,setChannelLoading] = useState(false),[busy,setBusy] = useState(false);
  const [error,setError] = useState(""),[channelError,setChannelError] = useState("");
  const [quote,setQuote] = useState<Quote|null>(null),[confirmed,setConfirmed] = useState(false),[now,setNow] = useState(Date.now());
  const [loadAttempt,setLoadAttempt] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const actionLock = useRef(false);
  const path = `/v1/admin/orders/${encodeURIComponent(orderId)}/shipping`;
  const editable = Boolean(detail?.canShip && !detail.shipment);
  const issues = shippingPackageIssues(pieces);
  const quoteExpired = Boolean(quote && now >= quote.expiresAt);
  const canQuote = editable && !busy && !loading && !channelLoading && !channelError && Boolean(channel) && !issues.length;
  const readiness = !detail ? loading ? "正在读取订单信息…" : "订单读取失败，请重试。" : !detail.canShip ? detail?.blockReason || "请先确认订单付款及履约状态。" : channelLoading ? "正在读取授权物流渠道…" : channelError ? "物流渠道加载失败，请重试。" : !channels.length ? "暂无可用物流渠道，请联系物流商开通。" : !channel ? "请选择物流渠道，再核对包裹信息。" : issues.length ? issues[0] : quote ? quoteExpired ? "报价已过期，请重新查询。" : confirmed ? "已确认信息，可提交面单请求。" : "请核对报价并勾选确认，再生成面单。" : "信息已齐全，可以查询物流成本。";

  async function loadChannels(signal?:AbortSignal) {
    setChannelLoading(true);setChannelError("");
    try { const result = await request<{channels:Channel[]}>("/v1/admin/shipping/channels",{signal},token);if(!signal?.aborted)setChannels(result.channels); }
    catch(reason) { if(!signal?.aborted)setChannelError(message(reason)); }
    finally { if(!signal?.aborted)setChannelLoading(false); }
  }
  useEffect(()=>{
    const controller = new AbortController(),previous = document.activeElement as HTMLElement|null;
    dialog.current?.focus();setLoading(true);setError("");
    void request<Detail>(path,{signal:controller.signal},token).then(async data=>{
      if(controller.signal.aborted)return;
      setDetail(data);setPieces(data.pieces);
      if(data.canShip&&!data.shipment)await loadChannels(controller.signal);
    }).catch(reason=>{if(!controller.signal.aborted)setError(message(reason));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>{controller.abort();previous?.focus();};
  },[path,token,loadAttempt]);
  useEffect(()=>{if(!quote)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[quote]);

  async function post<T>(action:string,body:unknown) { return request<T>(`${path}/${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},token); }
  async function run(action:()=>Promise<void>) {
    if(actionLock.current)return;
    actionLock.current=true;setBusy(true);setError("");
    try { await action(); } catch(reason) { setError(message(reason)); } finally { actionLock.current=false;setBusy(false); }
  }
  function invalidateQuote() {setQuote(null);setConfirmed(false);}
  function queryCost() {if(!canQuote)return;void run(async()=>{setQuote(await post<Quote>("quote",{channelCode:channel,pieces}));setConfirmed(false);});}
  function confirmLabel() {if(!editable||!quote||Date.now()>=quote.expiresAt||!confirmed)return;void run(async()=>{setDetail(await post<Detail>("confirm",{quoteId:quote.quoteId,confirm:true}));invalidateQuote();});}

  return <div className="modal-overlay shipping-overlay"><div className="order-shipping" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="shipping-dialog-title" onKeyDown={event=>{
    if(event.key==="Escape"&&!actionLock.current){event.preventDefault();onClose();}
    if(event.key!=="Tab")return;
    const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')??[]),first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }}>
    <header className="shipping-header">
      <span className="shipping-header-icon"><Package aria-hidden="true"/></span>
      <div><h2 id="shipping-dialog-title">物流与面单 <span>{detail?.orderNumber || "读取订单中…"}</span></h2><p>客户配送费 <strong>{detail?`${money(detail.customerShippingCents)}${detail.customerShippingCents===0?" · 包邮":""}`:"—"}</strong><span className="shipping-header-separator">·</span><span className="shipping-cost-note">物流报价为 CUC 承担的成本</span></p></div>
      <button type="button" className="shipping-close" disabled={busy} onClick={onClose} aria-label="关闭物流面板">关闭 <X aria-hidden="true"/></button>
    </header>
    <div className="shipping-body">
      {error&&<div className="shipping-notice shipping-notice-error" role="alert"><WarningCircle aria-hidden="true"/><div><strong>操作未完成</strong><p>{error}</p>{!detail&&<button type="button" className="shipping-text-button" disabled={busy||loading} onClick={()=>setLoadAttempt(value=>value+1)}>重新加载订单</button>}</div></div>}
      {loading&&!detail&&<div className="shipping-loading" role="status"><ArrowClockwise aria-hidden="true"/>正在读取订单与包裹信息…</div>}
      {detail&&<>
        {detail.testMode&&<div className="shipping-notice" role="status"><Info aria-hidden="true"/><p>测试订单 · 使用测试物流配置，面单不可用于实际寄件。</p></div>}
        {!detail.canShip&&!detail.shipment&&<div className="shipping-notice shipping-notice-warning" role="status"><WarningCircle aria-hidden="true"/><div><strong>此订单暂不能创建面单</strong><p>{detail.blockReason || "请先核对付款和履约状态。仅已付款、无退款或争议、已确认或备货中的订单可以创建面单。"}</p></div></div>}
        <section className="shipping-card" aria-labelledby="shipping-address-title">
          <div className="shipping-section-title"><span><MapPin aria-hidden="true"/></span><h3 id="shipping-address-title">发货与收件信息</h3></div>
          <div className="shipping-address-grid"><div><Warehouse aria-hidden="true"/><div><h4>发货仓</h4><p>{detail.origin}</p></div></div><div><User aria-hidden="true"/><div><h4>收件人 <span>{detail.address.name} · {detail.address.phone}</span></h4><p>{detail.address.line1}{detail.address.line2&&<><br/>{detail.address.line2}</>}<br/>{detail.address.city}, {detail.address.state} {detail.address.zip}</p></div></div></div>
          <div className="shipping-inline-note"><Info aria-hidden="true"/><span>所选渠道须在物流商后台绑定此发货仓；面单生成后请再次核对寄件地址。</span></div>
        </section>
        {detail.shipment?<section className="shipping-card shipping-shipment">
          <div className="shipping-section-title"><span><FilePdf aria-hidden="true"/></span><div><h3>{labels[detail.shipment.status] || "物流状态待核查"}</h3><p>面单生成与订单实际发货是两个独立步骤。</p></div></div>
          <dl><div><dt>物流渠道</dt><dd>{detail.shipment.channel_name || "—"}</dd></div><div><dt>试算物流成本</dt><dd>{money(detail.shipment.cost_cents)}</dd></div><div><dt>运单参考编号</dt><dd>{detail.shipment.reference_no}</dd></div><div><dt>物流单号</dt><dd>{detail.shipment.tracking_number || "等待物流商返回"}</dd></div></dl>
          {detail.shipment.error_code&&<p className="shipping-shipment-code">核查代码：{detail.shipment.error_code}</p>}
          {["unknown","submitting","failed"].includes(detail.shipment.status)&&<div className="shipping-notice shipping-notice-warning"><WarningCircle aria-hidden="true"/><p>请先核查本次提交结果或联系物流商，切勿重复创建运单。</p></div>}
          {detail.shipment.label_url&&<a className="shipping-secondary-button" href={detail.shipment.label_url} target="_blank" rel="noopener noreferrer"><FilePdf aria-hidden="true"/>{detail.testMode?"打开 / 打印测试面单":"打开 / 打印 PDF 面单"}<ArrowRight aria-hidden="true"/></a>}
          <p className="shipping-support-copy">承运商实际接收包裹后，请返回订单管理更新履约状态。当前不支持自动作废面单、预约取件或自动同步物流轨迹。</p>
        </section>:<>
          <section className="shipping-card" aria-labelledby="shipping-channel-title">
            <div className="shipping-section-title"><span><Truck aria-hidden="true"/></span><div><h3 id="shipping-channel-title">普通快递渠道</h3><p>{channelLoading?"正在读取账号授权渠道…":channels.length?`已读取 ${channels.length} 个授权渠道，请核对承运商及发货区域。`:"选择物流账号已授权的渠道"}</p></div><button type="button" className="shipping-text-button" disabled={!editable||channelLoading||busy} onClick={()=>void loadChannels()}><ArrowClockwise aria-hidden="true"/>刷新渠道</button></div>
            {channelError?<div className="shipping-notice shipping-notice-error" role="alert"><WarningCircle aria-hidden="true"/><p>{channelError}</p></div>:editable&&!channelLoading&&!loading&&!channels.length?<div className="shipping-notice shipping-notice-warning"><Info aria-hidden="true"/><p>物流账号暂无可用渠道。请联系物流商开通美国境内普通快递渠道并绑定发货仓。</p></div>:null}
            <label className="shipping-channel-field"><span className="sr-only">普通快递渠道</span><select disabled={!editable||loading||busy||channelLoading||!channels.length} value={channel} onChange={event=>{setChannel(event.target.value);invalidateQuote();}}><option value="">{!editable?"订单满足发货条件后可选择渠道":channelLoading?"正在读取物流渠道…":"请选择普通快递渠道"}</option>{channels.map(item=><option key={item.code} value={item.code}>{item.carrier} · {item.name} ({item.code})</option>)}</select></label>
          </section>
          <section className="shipping-card shipping-packages" aria-labelledby="shipping-packages-title">
            <div className="shipping-section-title"><span><Package aria-hidden="true"/></span><div><h3 id="shipping-packages-title">箱规信息</h3><p>每个 SKU 独立包装。重量为每箱重量（lb），尺寸为外箱尺寸（inch）。请核对实际包装。</p></div><span className="shipping-count">{pieces.reduce((sum,piece)=>sum+(Number.isFinite(piece.pcs)?piece.pcs:0),0)} 箱</span></div>
            <div className="shipping-table-scroll"><table><thead><tr><th>商品 / SKU</th><th>箱数</th><th>每箱重量 <span>lb</span></th><th>长 <span>inch</span></th><th>宽 <span>inch</span></th><th>高 <span>inch</span></th></tr></thead><tbody>{pieces.map((piece,index)=><tr key={piece.orderItemId}><td>{piece.name&&<strong>{piece.name}</strong>}<span className="shipping-sku">{piece.sku}</span>{piece.orderedQuantity!==undefined&&<small>订单数量：{piece.orderedQuantity}</small>}</td>{packageFields.map(key=><td key={key}><input aria-label={`${piece.sku} ${packageFieldLabels[key]}`} aria-invalid={!validPackageField(key,piece[key])} disabled={!editable||busy} type="number" inputMode={key==="pcs"?"numeric":"decimal"} min={key==="pcs"?1:key==="actual"?0.001:0.1} max={packageDisplay(999,key)} step={key==="pcs"?1:key==="actual"?0.001:0.1} placeholder="待填写" value={piece[key]?Number(packageDisplay(piece[key],key).toFixed(6)):""} onChange={event=>{setPieces(current=>current.map((value,i)=>i===index?{...value,[key]:packageMetric(Number(event.target.value),key)}:value));invalidateQuote();}}/></td>)}</tr>)}</tbody></table></div>
            {editable&&issues.length>0&&<div className="shipping-package-issues" role="status"><WarningCircle aria-hidden="true"/><div><strong>查询前请补齐包裹信息</strong>{issues.map(issue=><p key={issue}>{issue}</p>)}</div></div>}
            <p className="shipping-support-copy">预填值来自商品 / 规格的运输资料；缺少的实测重量与尺寸需要手动填写。一次最多支持 20 箱。</p>
          </section>
          {quote&&<section className={`shipping-card shipping-quote${quoteExpired?" shipping-quote-expired":""}`} aria-labelledby="shipping-quote-title">
            <div className="shipping-section-title"><span><Calculator aria-hidden="true"/></span><div><h3 id="shipping-quote-title">物流成本试算</h3><p>{quote.channelName}</p></div><strong className="shipping-quote-price">{money(quote.costCents)} <small>USD</small></strong></div>
            <p className="shipping-support-copy">{quoteExpired?"报价已过期，请重新查询。":`可确认至 ${new Date(quote.expiresAt).toLocaleTimeString("zh-CN")}。`}最终费用可能受复称、箱规或附加费影响，客户配送费不会因此改变。</p>
            {quote.isRemote&&<div className="shipping-inline-note"><Info aria-hidden="true"/>此地址被物流商标记为偏远地址。</div>}
            {!quoteExpired&&<label className="shipping-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/><span>{detail.testMode?"我已核对收件地址和箱规，确认生成测试运单。":"我已核对渠道发货仓、收件地址、实测箱规与费用；确认后将向正式物流商提交运单，可能产生物流费用。"}</span></label>}
          </section>}
        </>}
      </>}
    </div>
    <footer className="shipping-footer"><div>{detail?.shipment?<><Info aria-hidden="true"/><span>生成面单不代表已发货</span></>:<>{canQuote?<CheckCircle aria-hidden="true"/>:<Info aria-hidden="true"/>}<span>{busy?"正在处理，请勿重复提交…":readiness}</span></>}</div><div className="shipping-footer-actions">
      {detail?.shipment?<button type="button" className="shipping-primary-button" disabled={busy} onClick={()=>void run(async()=>setDetail(await post<Detail>("refresh",{})))}><ArrowClockwise aria-hidden="true"/>{busy?"核查中…":"核查面单结果"}</button>:quote&&!quoteExpired?<><button type="button" className="shipping-secondary-button" disabled={!canQuote} onClick={queryCost}>重新查询</button><button type="button" className="shipping-primary-button" disabled={!editable||busy||!confirmed} onClick={confirmLabel}>{busy?"正在提交…":"确认并生成面单"}<ArrowRight aria-hidden="true"/></button></>:<button type="button" className="shipping-primary-button" disabled={!canQuote} onClick={queryCost}><Calculator aria-hidden="true"/>{busy?"正在查询…":quoteExpired?"重新查询物流成本":"查询物流成本"}<ArrowRight aria-hidden="true"/></button>}
    </div></footer>
  </div></div>;
}

import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {OrderShipping} from "../../app/order-shipping";
import "../../app/globals.css";
// Only this local acceptance page redirects its API requests to the isolated fake provider.
const originalFetch=window.fetch.bind(window);
window.fetch=(input,init)=>originalFetch(typeof input==="string"?input.replace("http://localhost:8787/","http://localhost:8878/"):input,init);
function Preview(){const [fixture,setFixture]=useState<{orders:{id:string;name:string}[];adminToken:string}|null>(null),[selected,setSelected]=useState<string|null>(null),[error,setError]=useState("");
 useEffect(()=>{fetch('http://localhost:8787/__fixture').then(r=>r.json()).then(setFixture).catch(()=>setError('请先启动本地物流验收 API'))},[]);
 return <main style={{maxWidth:1050,margin:'48px auto',padding:24}}><p>CUC SUPPLY · LOCAL ACCEPTANCE</p><h1>尾程物流操作预览</h1><p>以下订单、报价、物流单号及面单均为本地模拟；不会产生真实运单或物流费用。</p>{error&&<p role="alert">{error}</p>}<section className="panel" style={{padding:24,display:'grid',gap:16}}>{fixture?.orders.map(order=><button key={order.id} onClick={()=>setSelected(order.id)} style={{padding:16,textAlign:'left'}}>{order.name} →</button>)}</section><button style={{marginTop:20,padding:12}} onClick={()=>fetch('http://localhost:8787/__outage',{method:'POST'}).then(r=>r.json()).then(r=>setError(r.providerDown?'模拟物流商故障已开启':'模拟物流商故障已关闭'))}>切换模拟物流商故障</button>{selected&&fixture&&<OrderShipping key={selected} token={fixture.adminToken} orderId={selected} onClose={()=>setSelected(null)}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);

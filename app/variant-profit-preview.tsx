type ProfitInput={priceCents:number;costCents:number|null;maxShippingCostCents:number|null};
export function calculateVariantProfit({priceCents,costCents,maxShippingCostCents}:ProfitInput){
 const rewardsCents=Math.ceil(priceCents*15/100),cardFeeCents=Math.ceil(priceCents*3/100),packagingCents=100;
 const profitCents=costCents===null||maxShippingCostCents===null?null:priceCents-costCents-maxShippingCostCents-rewardsCents-cardFeeCents-packagingCents;
 return {rewardsCents,cardFeeCents,packagingCents,profitCents,marginPercent:profitCents===null||priceCents===0?null:profitCents/priceCents*100};
}
export const variantShippingCostsKey="variant_shipping_costs_cents";
export function variantShippingCost(fields:Record<string,string>,variant:{id?:string;sku:string}):number|null{
 let costs:unknown;try{costs=JSON.parse(fields[variantShippingCostsKey]??"{}")}catch{return null}
 if(!costs||typeof costs!=="object"||Array.isArray(costs))return null;
 const map=costs as Record<string,unknown>,value=(variant.id?map[variant.id]:undefined)??map[variant.sku];
 return typeof value==="number"&&Number.isSafeInteger(value)&&value>=0?value:null;
}
export function setVariantShippingCost(fields:Record<string,string>,variant:{id?:string;sku:string},value:number|null):Record<string,string>{
 let costs:Record<string,number>={};try{const parsed:unknown=JSON.parse(fields[variantShippingCostsKey]??"{}");if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))costs=Object.fromEntries(Object.entries(parsed).filter(([,value])=>typeof value==="number"&&Number.isSafeInteger(value)&&value>=0))}catch{/* Start with an empty map if old metadata is invalid. */}
 const key=variant.id||variant.sku;if(value===null){delete costs[key];delete costs[variant.sku]}else costs[key]=value;
 return {...fields,[variantShippingCostsKey]:JSON.stringify(costs)};
}
export function VariantProfitPreview(input:ProfitInput){
 const {rewardsCents,cardFeeCents,packagingCents,profitCents,marginPercent}=calculateVariantProfit(input);
 const money=(cents:number)=>`$${(cents/100).toFixed(2)}`;
 return <div className="variant-profit-preview" aria-live="polite"><dl>
 <div><dt>规格售价</dt><dd>+{money(input.priceCents)}</dd></div>
 <div><dt>规格成本</dt><dd>{input.costCents===null?"未填写":`−${money(input.costCents)}`}</dd></div>
 <div><dt>最高运费</dt><dd>{input.maxShippingCostCents===null?"未填写":`−${money(input.maxShippingCostCents)}`}</dd></div>
 <div><dt>最高返现（售价 × 15%）</dt><dd>−{money(rewardsCents)}</dd></div>
 <div><dt>信用卡手续费（售价 × 3%）</dt><dd>−{money(cardFeeCents)}</dd></div>
 <div><dt>包装成本</dt><dd>−{money(packagingCents)}</dd></div>
 <div className="variant-profit-total"><dt>预估单件利润</dt><dd className={profitCents!==null&&profitCents<0?"profit-negative":""}>{profitCents===null?"—":`${profitCents<0?"−":""}${money(Math.abs(profitCents))}`}</dd></div>
 </dl><p>利润率（利润 ÷ 售价）：<strong className={profitCents!==null&&profitCents<0?"profit-negative":""}>{marginPercent===null?"—":`${marginPercent.toFixed(1)}%`}</strong></p>
 {profitCents!==null&&profitCents<0&&<p className="profit-negative">成本和预留费用合计 {money(input.priceCents-profitCents)}，比售价多 {money(-profitCents)}，因此预估亏损。</p>}
 <small>返现按最高 15% 预留；返现和信用卡手续费均向上取整到美分。未计税费及其他费用。此处为成本预估，不会向顾客额外收取手续费。</small></div>;
}

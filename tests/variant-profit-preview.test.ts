import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateVariantProfit,variantShippingCost,setVariantShippingCost} from '../app/variant-profit-preview';
test('profit deducts 3% card fee, 15% rewards, shipping, cost and $1 packaging',()=>{
 assert.deepEqual(calculateVariantProfit({priceCents:10000,costCents:4000,maxShippingCostCents:1000}),{rewardsCents:1500,cardFeeCents:300,packagingCents:100,profitCents:3100,marginPercent:31});
});
test('fractional cents round upward and zero values remain valid',()=>{
 const result=calculateVariantProfit({priceCents:4599,costCents:2000,maxShippingCostCents:500});assert.equal(result.cardFeeCents,138);assert.equal(result.rewardsCents,690);assert.equal(result.profitCents,1171);
 assert.equal(calculateVariantProfit({priceCents:0,costCents:0,maxShippingCostCents:0}).marginPercent,null);
 assert.equal(calculateVariantProfit({priceCents:100,costCents:0,maxShippingCostCents:0}).profitCents,-18);
});
test('missing cost stays unknown; losses are not hidden',()=>{
 assert.equal(calculateVariantProfit({priceCents:10000,costCents:null,maxShippingCostCents:1000}).profitCents,null);
 assert.equal(calculateVariantProfit({priceCents:10000,costCents:4000,maxShippingCostCents:null}).profitCents,null);
 assert.equal(calculateVariantProfit({priceCents:10000,costCents:9500,maxShippingCostCents:1000}).profitCents,-2400);
});
test('shipping allowance survives existing metafield storage and each variant stays independent',()=>{
 const first={sku:'A'},second={id:'id-b',sku:'B'};let fields=setVariantShippingCost({other:'preserve'},first,1200);fields=setVariantShippingCost(fields,second,0);
 const saved=JSON.parse(JSON.stringify(fields));assert.equal(variantShippingCost(saved,{id:'new-id-a',sku:'A'}),1200);assert.equal(variantShippingCost(saved,second),0);assert.equal(saved.other,'preserve');
 fields=setVariantShippingCost(fields,second,null);assert.equal(variantShippingCost(fields,second),null);assert.equal(variantShippingCost(fields,first),1200);
});

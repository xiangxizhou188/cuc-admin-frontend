import assert from 'node:assert/strict';
import test from 'node:test';
import {shippingPackageIssues,validPackageField,type ShippingPiece} from '../app/order-shipping-state';
const piece:ShippingPiece={orderItemId:'item',sku:'CUC-001',pcs:1,actual:2.5,length:30,width:20,height:10};
test('complete packages are ready; empty or missing defaults explain why quoting is blocked',()=>{
 assert.deepEqual(shippingPackageIssues([piece]),[]);
 assert.match(shippingPackageIssues([])[0]!,/没有可报价/);
 assert.match(shippingPackageIssues([{...piece,actual:0}])[0]!,/CUC-001.*每箱重量/);
});
test('package limits reject fractional boxes, invalid numbers and more than twenty total boxes',()=>{
 assert.equal(validPackageField('pcs',1.5),false);
 for(const value of [NaN,Infinity,-1,0,1000])assert.equal(validPackageField('actual',value),false);
 assert.equal(validPackageField('actual',0.001),true);
 assert.ok(shippingPackageIssues([{...piece,pcs:11},{...piece,orderItemId:'second',pcs:10}]).some(issue=>issue.includes('20 箱')));
 assert.deepEqual(shippingPackageIssues([{...piece,pcs:20}]),[]);
});

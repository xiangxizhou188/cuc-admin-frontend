import assert from 'node:assert/strict';
import test from 'node:test';
import {weightInLb,imperialDimensions,packageDisplay,packageMetric} from '../app/shipping-units';
test('existing metric product dimensions and weights retain physical size in imperial editing',()=>{
 assert.ok(Math.abs(weightInLb(4.5359237,'kg')-10)<1e-9);
 assert.equal(weightInLb(16,'oz'),1);
 const fields=imperialDimensions({shipping_length:'25.4',shipping_width:'12.7',shipping_distance_unit:'cm',other:'retained'});
 assert.equal(fields.shipping_length,'10');assert.equal(fields.shipping_width,'5');assert.equal(fields.other,'retained');assert.equal(fields.shipping_distance_unit,'in');
 assert.deepEqual(imperialDimensions(fields),fields);
});
test('lb and inch entry is converted to provider kg and cm, not relabeled',()=>{
 assert.ok(Math.abs(packageMetric(10,'actual')-4.5359237)<1e-9);assert.equal(packageMetric(10,'length'),25.4);
 for(const key of ['actual','length','width','height','pcs'])assert.ok(Math.abs(packageMetric(packageDisplay(12.345,key),key)-12.345)<1e-9);
});

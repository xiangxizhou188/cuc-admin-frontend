export const relatedProductsKey="related_product_ids";
export function readRelatedProductIds(value:string|undefined):string[]{
  if(!value)return [];
  const ids:unknown=JSON.parse(value);
  if(!Array.isArray(ids)||ids.length>3||ids.some(id=>typeof id!=="string"||!id.trim()||id.length>200)||new Set(ids).size!==ids.length)throw new Error("关联产品必须为最多 3 个不同商品。");
  return ids as string[];
}

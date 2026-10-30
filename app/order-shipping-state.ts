export type ShippingPiece = {orderItemId:string;sku:string;name?:string;orderedQuantity?:number;pcs:number;actual:number;length:number;width:number;height:number};
export const packageFields = ["pcs","actual","length","width","height"] as const;
export const packageFieldLabels = {pcs:"箱数",actual:"每箱重量",length:"长",width:"宽",height:"高"};
export function validPackageField(key:typeof packageFields[number],value:number) {
  return Number.isFinite(value) && value > 0 && value <= 999 && (key !== "pcs" || Number.isInteger(value));
}
export function shippingPackageIssues(pieces:ShippingPiece[]) {
  if (!pieces.length) return ["订单没有可报价的包裹明细。"];
  const issues = pieces.flatMap(piece => {
    const missing = packageFields.filter(key => !validPackageField(key,piece[key])).map(key => packageFieldLabels[key]);
    return missing.length ? [`${piece.sku}：请补齐有效的${missing.join("、")}。`] : [];
  });
  if (pieces.reduce((sum,piece)=>sum + (Number.isFinite(piece.pcs) ? piece.pcs : 0),0) > 20) issues.push("总箱数超过 20 箱，请先联系物流商人工确认。");
  return issues;
}

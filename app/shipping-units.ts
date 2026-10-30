export const LB_TO_KG=0.45359237;
export const INCH_TO_CM=2.54;
export function weightInLb(value:number,unit:string){return value*({lb:1,oz:1/16,kg:1/LB_TO_KG,g:1/(1000*LB_TO_KG)}[unit]??1)}
export function imperialDimensions(fields:Record<string,string>){
 const factor=({in:1,cm:1/INCH_TO_CM,mm:1/25.4,ft:12,m:100/INCH_TO_CM,yd:36}[fields.shipping_distance_unit||"in"]??1);
 const next:Record<string,string>={...fields,shipping_distance_unit:"in"};
 for(const key of ["shipping_length","shipping_width","shipping_height"])if(fields[key])next[key]=String(Number((Number(fields[key])*factor).toPrecision(12)));
 return next;
}
export function packageDisplay(value:number,key:string){return key==="actual"?value/LB_TO_KG:key==="pcs"?value:value/INCH_TO_CM}
export function packageMetric(value:number,key:string){return key==="actual"?value*LB_TO_KG:key==="pcs"?value:value*INCH_TO_CM}

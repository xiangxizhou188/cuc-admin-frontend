export const usStates:Record<string,string>={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
export type TaxRule={amountCents:number|null;transactions:number|null;operator:'or'|'and';comparison:'gt'|'gte';period:'current_previous_year'|'previous_year'|'rolling_12_months'|'ny_sales_quarters';basis:'gross_goods'|'taxable_goods'|'retail_goods';includeShipping:boolean;deductRefunds:boolean;sourceUrl:string;verifiedOn:string;effectiveOn:string;deadlineNote:string;timezone:string};
export type TaxStatus='Not Required'|'Needs Review'|'Approaching Threshold'|'Registration Required'|'Registration Pending'|'Registered';
export function thresholdResult(rule:TaxRule,sales:number,count:number){
 const checks=[rule.amountCents===null?null:(rule.comparison==='gt'?sales>rule.amountCents:sales>=rule.amountCents),rule.transactions===null?null:(rule.comparison==='gt'?count>rule.transactions:count>=rule.transactions)].filter(value=>value!==null);
 const progress=[rule.amountCents? sales/rule.amountCents:null,rule.transactions?count/rule.transactions:null].filter((x):x is number=>x!==null);
 return {met:checks.length>0&&(rule.operator==='and'?checks.every(Boolean):checks.some(Boolean)),progress:progress.length?(rule.operator==='and'?Math.min(...progress):Math.max(...progress)):0};
}
function midnight(year:number,month:number,day:number,timezone:string){
 const target=Date.UTC(year,month,day);let value=target;
 for(let i=0;i<3;i++){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));
  const represented=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second));value+=target-represented;
 }
 return new Date(value).toISOString();
}
export function taxWindows(rule:TaxRule|null,now=new Date()){
 const tz=rule?.timezone??'America/New_York';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now).map(p=>[p.type,p.value]));
 const year=Number(parts.year),month=Number(parts.month)-1,day=Number(parts.day),end=now.toISOString();
 if(rule?.period==='ny_sales_quarters'){
  // New York sales-tax quarters start March, June, September and December.
  let quarter=Math.floor((month-2)/3)*3+2,y=year;if(quarter<0){quarter+=12;y--}
  const boundary=new Date(Date.UTC(y,quarter,1));
  const at=(delta:number)=>{const d=new Date(Date.UTC(boundary.getUTCFullYear(),boundary.getUTCMonth()+delta,1));return midnight(d.getUTCFullYear(),d.getUTCMonth(),1,tz)};
  return {start:at(-12),end:at(0),previousStart:at(-15),previousEnd:at(-3),label:'Last 4 completed NY sales-tax quarters'};
 }
 if(rule?.period==='rolling_12_months'){const at=(y:number)=>midnight(y,month,Math.min(day,new Date(Date.UTC(y,month+1,0)).getUTCDate()),tz);return {start:at(year-1),end,previousStart:at(year-2),previousEnd:at(year-1),label:'Rolling 12 months'};}
 return {start:midnight(year,0,1,tz),end,previousStart:midnight(year-1,0,1,tz),previousEnd:midnight(year,0,1,tz),label:rule?.period==='previous_year'?'Previous calendar year determines threshold':'Current / previous calendar year'};
}
export function taxRuleFresh(rule:TaxRule|null,now=new Date()){
 if(!rule)return false;
 const reviewed=Date.parse(rule.verifiedOn+'T00:00:00Z'),effective=Date.parse(rule.effectiveOn+'T00:00:00Z');
 return Number.isFinite(reviewed)&&reviewed<=now.getTime()&&now.getTime()-reviewed<=180*86400000&&effective<=now.getTime();
}

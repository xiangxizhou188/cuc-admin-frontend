import {usStateCode} from './us-address';
export type GoogleAddressComponent={longText:string;shortText?:string;types:string[]};
export type SuggestedAddress={addressLine1:string;addressLine2:string;city:string;state:string;postalCode:string};
export function googleAddress(components:GoogleAddressComponent[]):SuggestedAddress|null{
 const component=(type:string)=>components.find(c=>c.types.includes(type));
 const text=(type:string)=>component(type)?.longText??'';
 if(component('country')?.shortText!=='US'||!text('route'))return null;
 const zip=text('postal_code'),suffix=text('postal_code_suffix');
 return {addressLine1:[text('street_number'),text('route')].filter(Boolean).join(' '),addressLine2:text('subpremise'),city:text('locality')||text('postal_town')||text('sublocality_level_1'),state:usStateCode(component('administrative_area_level_1')?.shortText??text('administrative_area_level_1'))??'',postalCode:zip+(zip&&suffix?`-${suffix}`:'')};
}

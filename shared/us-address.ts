import {usStates} from './sales-tax';

export function isUsCountry(country:string){
 return ['us','usa','united states','united states of america'].includes(country.trim().toLowerCase());
}

export function usStateCode(value:string):string|null{
 const normalized=value.trim().toUpperCase();
 return Object.entries(usStates).find(([code,name])=>code===normalized||name.toUpperCase()===normalized)?.[0]??null;
}

import cities from './data/osaka-cities.json';

export const osakaCities = cities;
export const osakaAreaGroups = [
 {label:'大阪市・堺市', codes:['27100','27140']},
 {label:'北摂', codes:['27203','27204','27205','27207','27211','27220','27224','27301','27321','27322']},
 {label:'北河内', codes:['27209','27210','27215','27218','27223','27229','27230']},
 {label:'中河内', codes:['27212','27221','27227']},
 {label:'南河内', codes:['27214','27216','27217','27222','27226','27231','27381','27382','27383']},
 {label:'泉州', codes:['27202','27206','27208','27213','27219','27225','27228','27232','27341','27361','27362','27366']},
];

export function osakaCityHref(city: string) {
 return `/properties?${new URLSearchParams({prefecture:'osaka',city})}`;
}

// Exact, allowlisted aliases keep city boundaries intact (大阪市 ≠ 東大阪市).
// Include legacy ward/county/prefecture forms without changing saved addresses.
export function citySearchValues(prefecture:string|undefined,city:string):string[] {
 if(prefecture!=='osaka')return [city];
 const municipality=cities.find(c=>c.name===city||c.label===city||city===`大阪府${c.name}`);
 return municipality ? municipality.aliases : [city];
}

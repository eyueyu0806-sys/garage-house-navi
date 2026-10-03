import type {Property} from './types';
const base = {
 town:'',full_address:null,station:'最寄駅（サンプル）',walking_minutes:12,management_fee:5000,deposit:180000,key_money:180000,
 layout:'1LDK',floor_area:82.4,built_at:'2025-03-01',structure:'木造',floor:'1–2階',garage_count:2,garage_type:'ビルトインガレージ',shutter:true,electric_shutter:true,ev_charger:true,motorcycle:true,large_vehicle:true,direct_access:true,pet:null,diy:null,soho:true,office_use:null,other_features:'サンプル物件です。実際の募集情報ではありません。',description:'愛車を眺めながら過ごす時間も、暮らしの一部に。住空間とガレージが緩やかにつながる、開放的なガレージハウスをイメージしたサンプルです。所在地・条件はすべて画面確認用の架空データです。',
 transaction_type:'仲介（サンプル）',available_from:'サンプル・募集なし',contract_period:'2年（サンプル）',insurance:'確認中',guarantee:'確認中',other_costs:'確認中',renewal_fee:'確認中',cancellation_terms:'確認中',information_checked_at:'2026-10-03',next_update_at:'2026-10-17',status:'published',featured:true,created_at:'2026-10-03T00:00:00Z',updated_at:'2026-10-03T00:00:00Z',published_at:'2026-10-03T00:00:00Z'
} as const;
export const demoProperties:Property[]=[
 {id:'00000000-0000-4000-8000-000000000001',property_name:'MINOH GARAGE RESIDENCE',slug:'sample-minoh-residence',property_code:'SAMPLE-001',prefecture:'osaka',city:'箕面市',city_slug:'minoh',rent:198000,catch_copy:'愛車と、緑を眺める日常。'},
 {id:'00000000-0000-4000-8000-000000000002',property_name:'ROKKO COURT HOUSE',slug:'sample-rokko-court',property_code:'SAMPLE-002',prefecture:'hyogo',city:'神戸市',city_slug:'kobe',rent:225000,catch_copy:'都市のそばに、自分だけの余白。'},
 {id:'00000000-0000-4000-8000-000000000003',property_name:'NARA GARAGE ATELIER',slug:'sample-nara-atelier',property_code:'SAMPLE-003',prefecture:'nara',city:'奈良市',city_slug:'nara-city',rent:168000,catch_copy:'好きなものと暮らす、もうひとつの居場所。'}
].map((d,i)=>({...base,...d,garage_count:i===2?1:2,pet:i===2,diy:i===2,ev_charger:i!==2,property_images:[{id:`sample-${i}`,property_id:d.id,storage_path:'',alt:'ガレージハウスのイメージ写真（掲載物件の写真ではありません）',sort_order:0,url:'/images/hero.jpg'}]}));

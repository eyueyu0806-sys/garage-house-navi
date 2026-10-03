import {z} from 'zod';
import {PREFECTURES,INQUIRY_TYPES,LEAD_STATUSES} from './constants';
const emptyNull=(v:unknown)=>v===''||v===undefined?null:v;
const text=(max=300)=>z.preprocess(emptyNull,z.string().trim().max(max).nullable());
const num=(max=100000000,integer=true)=>z.preprocess(v=>v===''||v==null?null:Number(v), (integer?z.number().int():z.number()).min(0).max(max).nullable());
const date=z.preprocess(emptyNull,z.iso.date().nullable());
const flag=z.boolean().nullable().default(null);
const prefecture=z.string().refine(v=>PREFECTURES.some(p=>p.slug===v),'都道府県を選択してください');
export const propertySchema=z.object({
 property_name:z.string().trim().min(1).max(160),slug:z.string().max(160).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),property_code:z.string().trim().min(1).max(80),
 prefecture,city:z.string().trim().min(1).max(80),city_slug:z.preprocess(emptyNull,z.string().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).nullable()),town:text(),full_address:text(),station:text(),walking_minutes:num(300),
 rent:z.coerce.number().int().min(0).max(100000000),management_fee:num(),deposit:num(),key_money:num(),layout:text(30),floor_area:num(100000,false),built_at:date,structure:text(50),floor:text(50),
 garage_count:num(50),garage_type:text(80),
 shutter:flag,electric_shutter:flag,ev_charger:flag,motorcycle:flag,large_vehicle:flag,direct_access:flag,pet:flag,diy:flag,soho:flag,office_use:flag,
 other_features:text(2000),catch_copy:text(200),description:text(10000),transaction_type:text(100),available_from:text(),contract_period:text(),insurance:text(),guarantee:text(),other_costs:text(2000),renewal_fee:text(),cancellation_terms:text(2000),information_checked_at:date,next_update_at:date,
 status:z.enum(['draft','published','closed']),featured:z.boolean()
}).superRefine((v,ctx)=>{if(v.floor_area===0)ctx.addIssue({code:'custom',path:['floor_area'],message:'0より大きい値、または未入力にしてください'});});
export const sourceSchema=z.object({source_company:text(),management_company:text(),contact_name:text(),contact_phone:text(50),contact_email:z.preprocess(emptyNull,z.email().max(254).nullable()),original_url:z.preprocess(emptyNull,z.url().refine(v=>/^https?:/.test(v)).max(2000).nullable()),advertising_permission:z.boolean(),permission_confirmed_at:date,last_availability_check:date,ad_fee:num(),brokerage_terms:text(3000),internal_notes:text(5000)});
const contact={name:z.string().trim().min(1,'氏名を入力してください').max(100),email:z.union([z.email().max(254),z.literal('')]).optional(),phone:z.union([z.string().regex(/^[+０-９0-9()（） -]{8,25}$/,'電話番号を確認してください'),z.literal('')]).optional(),consent:z.literal(true),website:z.string().max(0),submission_id:z.uuid(),form_token:z.string().max(300),source_url:z.string().max(2000)};
const contactCheck=(v:{email?:string;phone?:string},ctx:z.RefinementCtx)=>{if(!v.email&&!v.phone)ctx.addIssue({code:'custom',path:['email'],message:'メールアドレスまたは電話番号を入力してください'});};
export const inquirySchema=z.object({...contact,property_id:z.uuid(),inquiry_type:z.enum(INQUIRY_TYPES),message:z.string().trim().min(1,'問い合わせ内容を入力してください').max(5000),move_in:text(),car_model:text(),car_count:num(50),motorcycle_count:num(50),other_wishes:text(3000)}).superRefine(contactCheck);
export const requestSchema=z.object({...contact,prefecture:z.preprocess(emptyNull,prefecture.nullable()),city:text(80),budget:num(),layout:text(30),garage_count:num(50),car_model:text(),motorcycle_count:num(50),must_haves:text(3000),move_in:text(),message:text(5000)}).superRefine(contactCheck);
export const leadUpdateSchema=z.object({status:z.enum(Object.keys(LEAD_STATUSES) as [keyof typeof LEAD_STATUSES,...(keyof typeof LEAD_STATUSES)[]]),internal_notes:z.string().max(10000)});

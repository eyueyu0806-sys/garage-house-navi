import type {Metadata} from 'next';
import './globals.css';
import {siteUrl,demoMode} from '@/lib/config';
export const metadata:Metadata={metadataBase:new URL(siteUrl()),title:{default:'ガレージハウス・ガレージ付き賃貸を探す',template:'%s | GARAGE HOUSE NAVI'},description:'大阪・兵庫・京都・奈良を中心に、ガレージハウス・ガレージ付き賃貸を検索。ガレージ台数や設備、エリアから、愛車と暮らせる住まいを探せます。',robots:demoMode()?{index:false,follow:false}:undefined,verification:{google:'-iJzmbzkhiEtuS_mbWceJ00O3dp2XlJEzcBz-3dtX1Y'},openGraph:{siteName:'GARAGE HOUSE NAVI',locale:'ja_JP',type:'website'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}

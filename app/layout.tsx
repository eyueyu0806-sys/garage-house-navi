import type {Metadata} from 'next';
import './globals.css';
import {siteUrl,demoMode} from '@/lib/config';
export const metadata:Metadata={metadataBase:new URL(siteUrl()),title:{default:'GARAGE HOUSE NAVI | 愛車と暮らす、理想の住まいを。',template:'%s | GARAGE HOUSE NAVI'},description:'ガレージの台数・寸法・設備から探す、ガレージハウス専門の不動産検索。大阪・兵庫・京都・奈良を中心に全国対応。',robots:demoMode()?{index:false,follow:false}:undefined,openGraph:{siteName:'GARAGE HOUSE NAVI',locale:'ja_JP',type:'website'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}

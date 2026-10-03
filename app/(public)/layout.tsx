import {Header,Footer,MobileNav} from '@/components/site-shell';
export default function PublicLayout({children}:{children:React.ReactNode}){return <><Header/><main id="main">{children}</main><Footer/><MobileNav/></>}

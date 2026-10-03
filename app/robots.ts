import type {MetadataRoute} from 'next';import {demoMode,siteUrl} from '@/lib/config';
export default function robots():MetadataRoute.Robots{return {rules:demoMode()?{userAgent:'*',disallow:'/'}:{userAgent:'*',allow:'/',disallow:['/admin','/api/','/login','/request','/properties?']},sitemap:`${siteUrl()}/sitemap.xml`};}

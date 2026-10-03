import 'server-only';
export const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const demoMode = () => process.env.DEMO_MODE === 'true';
export const leadFormsEnabled = () => configured() && !demoMode() && process.env.LEAD_FORMS_ENABLED === 'true' && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.OPERATOR_NAME && process.env.OPERATOR_EMAIL);
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/,'');
export const operator = () => ({name:process.env.OPERATOR_NAME,address:process.env.OPERATOR_ADDRESS,phone:process.env.OPERATOR_PHONE,email:process.env.OPERATOR_EMAIL,license:process.env.OPERATOR_LICENSE,representative:process.env.OPERATOR_REPRESENTATIVE});

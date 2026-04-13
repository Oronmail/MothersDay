import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://yptpcpxyefboptosfxkh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseServiceKey) {
  console.error('Usage: SUPABASE_SERVICE_KEY=xxx npm run seed:admin -- <email> <password>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error('Usage: SUPABASE_SERVICE_KEY=xxx npm run seed:admin -- <email> <password>');
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) { console.error('Failed:', error.message); process.exit(1); }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', data.user.id);
  if (updateError) { console.error('Failed to set role:', updateError.message); process.exit(1); }

  console.log(`Admin user created: ${email} (${data.user.id})`);
}

main().catch(console.error);

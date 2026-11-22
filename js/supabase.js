/*
 * Public browser client for the Nangrong Supabase project.
 * A publishable key is intended for public browser code; never put a secret
 * or service_role key here. Database access is restricted by RLS policies.
 */
(function () {
  const projectUrl = 'https://bptnnssxcfovfqvdexei.supabase.co';
  const publishableKey = 'sb_publishable_nTLW3elleVKYICYBKmfOVg_7nV1AOcz';

  if (!window.supabase?.createClient) {
    console.error('Supabase client library did not load.');
    return;
  }

  window.nangrongSupabase = window.supabase.createClient(projectUrl, publishableKey);
})();

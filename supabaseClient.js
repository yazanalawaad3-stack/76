(function () {
  "use strict";

  window.__SUPABASE_URL = "https://lcwppbfjzhyyskdbzahp.supabase.co";
  window.__SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjd3BwYmZqemh5eXNrZGJ6YWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODYwMDksImV4cCI6MjA4NzU2MjAwOX0.PWyYHrvyqP2jeCKsumbBwiyMfGVNXYpWnOQFwlmpp9Q";

  window.getSupabase = function () {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase client not loaded");
    }
    if (!window.__sbClient) {
      window.__sbClient = window.supabase.createClient(window.__SUPABASE_URL, window.__SUPABASE_ANON_KEY);
    }
    return window.__sbClient;
  };
})();
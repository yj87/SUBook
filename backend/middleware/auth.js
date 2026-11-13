import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: ws } // must pass transport
});

export const requireMPPAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('profile_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "Forbidden: Profile not found" });
    }

    if (profile.role !== 'mpp_admin') {
      return res.status(403).json({ error: "Forbidden: MPP Admin access required" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Middleware Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

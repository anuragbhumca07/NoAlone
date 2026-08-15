import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-only Supabase client, authenticated with the service role key.
// Never expose this key (or this client) to the web/mobile bundles.
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  readonly client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      this.logger.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — Supabase auth sync disabled');
    }
    this.client = createClient(url || '', key || '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file and restart the development server.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    storage: {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore storage errors
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore storage errors
        }
      }
    }
  }
});

// Database types
export type Database = {
  public: {
    Tables: {
      participants: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          email: string | null;
          avatar_url: string | null;
          active: boolean;
          cycle_number: number;
          weekly_target_hizb: number; // <-- ajouté
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['participants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['participants']['Insert']>;
      };
      entries: {
        Row: {
          id: string;
          owner_id: string;
          participant_id: string;
          unit_type: 'hizb' | 'page';
          value_int: number;
          cycle_number: number;
          note: string | null;
          source: 'manual' | 'import' | 'seed' | 'starting_point'; // <-- ajouté starting_point
          recorded_at: string;
          created_at: string;
          updated_at: string;
          is_restart: boolean | null;
          previous_position: number | null;
        };
        Insert: Omit<Database['public']['Tables']['entries']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['entries']['Insert']>;
      };
      weekly_snapshots: {
        Row: {
          id: string;
          owner_id: string;
          participant_id: string;
          snapshot_at: string;
          week_key_tuesday: string;
          unit_type: 'hizb' | 'page';
          value_int: number;
          cycle_number: number;
          cumulative_hizb: number;
          cumulative_pages: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['weekly_snapshots']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['weekly_snapshots']['Insert']>;
      };
      app_settings: {
        Row: {
          owner_id: string;
          timezone: string;
          checkpoint_window_start: string;
          checkpoint_window_end: string;
          default_unit: 'hizb' | 'page';
          allow_iso_view: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['app_settings']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['app_settings']['Insert']>;
      };
      notifications_subscriptions: {
        Row: {
          id: string;
          owner_id: string;
          email: string | null;
          web_push_endpoint: string | null;
          web_push_p256dh: string | null;
          web_push_auth: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications_subscriptions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications_subscriptions']['Insert']>;
      };
    };
  };
};
export type AccessType = 'lifetime' | 'subscription' | 'purchased'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'
export type PlanType = 'monthly' | 'annual'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          hotmart_buyer_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      challenges: {
        Row: {
          id: string
          title: string
          description: string | null
          thumbnail_url: string | null
          category: string
          is_free: boolean
          days_count: number
          order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['challenges']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['challenges']['Insert']>
      }
      challenge_days: {
        Row: {
          id: string
          challenge_id: string
          day_number: number
          title: string
          video_url: string | null
          duration_seconds: number | null
        }
        Insert: Omit<Database['public']['Tables']['challenge_days']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['challenge_days']['Insert']>
      }
      user_challenges: {
        Row: {
          id: string
          user_id: string
          challenge_id: string
          access_type: AccessType
          granted_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_challenges']['Row'], 'id' | 'granted_at'>
        Update: Partial<Database['public']['Tables']['user_challenges']['Insert']>
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          challenge_id: string
          day_number: number
          completed_at: string
          watched_pct: number
        }
        Insert: Omit<Database['public']['Tables']['user_progress']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['user_progress']['Insert']>
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_sub_id: string
          status: SubscriptionStatus
          plan_type: PlanType
          current_period_end: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          product_id: string
          stripe_payment_id: string
          amount: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['purchases']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['purchases']['Insert']>
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['push_subscriptions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      access_type: AccessType
      subscription_status: SubscriptionStatus
      plan_type: PlanType
    }
  }
}

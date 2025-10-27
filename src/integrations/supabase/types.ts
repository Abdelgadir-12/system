export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
             profiles: {
         Row: {
           id: string
           name: string | null
           email: string | null
           "role": 'admin' | 'customer' | null
           phone: string | null
           address: string | null
           created_at: string | null
           updated_at: string | null
         }
         Insert: {
           id: string
           name?: string | null
           email?: string | null
           "role"?: 'admin' | 'customer' | null
           phone?: string | null
           address?: string | null
           created_at?: string | null
           updated_at?: string | null
         }
         Update: {
           id?: string
           name?: string | null
           email?: string | null
           "role"?: 'admin' | 'customer' | null
           phone?: string | null
           address?: string | null
           created_at?: string | null
           updated_at?: string | null
         }
       }
      pets: {
        Row: {
          id: string
          owner_id: string
          name: string
          type: string
          species: string
          breed: string | null
          weight: string | null
          birth_date: string
          gender: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          type: string
          species: string
          breed?: string | null
          weight?: string | null
          birth_date: string
          gender: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          type?: string
          species?: string
          breed?: string | null
          weight?: string | null
          birth_date?: string
          gender?: string
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          owner_id: string
          pet_name: string
          service: string
          appointment_date: string
          time_slot: string
          owner_name: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          pet_name: string
          service: string
          appointment_date: string
          time_slot: string
          owner_name: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          pet_name?: string
          service?: string
          appointment_date?: string
          time_slot?: string
          owner_name?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

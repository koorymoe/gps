export type UserRole = 'employee' | 'admin'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

export type SubscriptionType = '3_months' | '6_months' | 'yearly'
export type SubscriptionStatus = 'active' | 'expiring_soon' | 'expired_40' | 'expired_80' | 'terminated'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'delivered'
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed'
export type PurchaseType = 'device_sim' | 'device_only'

export interface Customer {
  id: string
  full_name: string
  father_name: string
  grandfather_name: string
  address: string
  phone: string
  id_card_front_url: string
  id_card_back_url: string
  residence_card_front_url: string
  residence_card_back_url: string
  created_at: string
}

export interface DeviceRequest {
  id: string
  customer_id: string
  customer?: Customer
  employee_id: string
  employee?: User
  admin_id?: string
  admin?: User
  purchase_type: PurchaseType
  subscription_type?: SubscriptionType
  subscription_start?: string
  subscription_end?: string
  subscription_status?: SubscriptionStatus
  status: RequestStatus
  notes?: string
  created_at: string
  delivered_at?: string
}

export interface RenewalRequest {
  id: string
  customer_id: string
  customer?: Customer
  device_request_id: string
  device_request?: DeviceRequest
  employee_id: string
  admin_id?: string
  subscription_type: SubscriptionType
  new_end_date?: string
  status: RequestStatus
  created_at: string
}

export interface MaintenanceRequest {
  id: string
  customer_id: string
  customer?: Customer
  employee_id: string
  employee?: User
  admin_id?: string
  problem_description: string
  status: MaintenanceStatus
  admin_notes?: string
  created_at: string
  resolved_at?: string
}

export interface DashboardStats {
  total_active: number
  expiring_soon: number
  expired_40: number
  expired_80: number
  pending_requests: number
  total_this_month: number
}

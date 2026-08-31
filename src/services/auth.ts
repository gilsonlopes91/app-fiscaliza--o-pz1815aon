import pb from '@/lib/pocketbase/client'

export type UserRole = 'admin' | 'usuario'
export type UserApprovalStatus = 'pendente' | 'aprovado' | 'rejeitado'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  approved: boolean
  approvalStatus: UserApprovalStatus
  avatar?: string
  created: string
  updated: string
}

export const authService = {
  getCurrentUser(): UserProfile | null {
    const model = pb.authStore.record
    if (!model) return null
    return {
      id: model.id,
      email: model.email,
      name: model.name || model.email.split('@')[0],
      role: (model.role as UserRole) || 'usuario',
      approved: Boolean(model.approved),
      approvalStatus:
        (model.approvalStatus as UserApprovalStatus) || (model.approved ? 'aprovado' : 'pendente'),
      avatar: model.avatar ? pb.files.getURL(model, model.avatar) : undefined,
      created: model.created,
      updated: model.updated,
    }
  },

  async login(email: string, password: string): Promise<UserProfile> {
    const authData = await pb.collection('users').authWithPassword(email.trim(), password)
    const model = authData.record
    return {
      id: model.id,
      email: model.email,
      name: model.name || model.email.split('@')[0],
      role: (model.role as UserRole) || 'usuario',
      approved: Boolean(model.approved),
      approvalStatus:
        (model.approvalStatus as UserApprovalStatus) || (model.approved ? 'aprovado' : 'pendente'),
      avatar: model.avatar ? pb.files.getURL(model, model.avatar) : undefined,
      created: model.created,
      updated: model.updated,
    }
  },

  async register(data: {
    name: string
    email: string
    password: string
    passwordConfirm: string
  }): Promise<UserProfile> {
    const record = await pb.collection('users').create({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      passwordConfirm: data.passwordConfirm,
      role: 'usuario',
      approved: false,
      approvalStatus: 'pendente',
    })

    return {
      id: record.id,
      email: record.email,
      name: record.name,
      role: 'usuario',
      approved: false,
      approvalStatus: 'pendente',
      created: record.created,
      updated: record.updated,
    }
  },

  logout(): void {
    pb.authStore.clear()
  },

  async refreshAuth(): Promise<UserProfile | null> {
    if (!pb.authStore.isValid) return null
    try {
      const authData = await pb.collection('users').authRefresh()
      const model = authData.record
      return {
        id: model.id,
        email: model.email,
        name: model.name || model.email.split('@')[0],
        role: (model.role as UserRole) || 'usuario',
        approved: Boolean(model.approved),
        approvalStatus:
          (model.approvalStatus as UserApprovalStatus) ||
          (model.approved ? 'aprovado' : 'pendente'),
        avatar: model.avatar ? pb.files.getURL(model, model.avatar) : undefined,
        created: model.created,
        updated: model.updated,
      }
    } catch {
      pb.authStore.clear()
      return null
    }
  },
}

export const usersService = {
  async getAll(): Promise<UserProfile[]> {
    const records = await pb.collection('users').getFullList({
      sort: '-created',
    })
    return records.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name || r.email,
      role: (r.role as UserRole) || 'usuario',
      approved: Boolean(r.approved),
      approvalStatus:
        (r.approvalStatus as UserApprovalStatus) || (r.approved ? 'aprovado' : 'pendente'),
      avatar: r.avatar ? pb.files.getURL(r, r.avatar) : undefined,
      created: r.created,
      updated: r.updated,
    }))
  },

  async approveUser(id: string): Promise<UserProfile> {
    const record = await pb.collection('users').update(id, {
      approved: true,
      approvalStatus: 'aprovado',
    })
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      role: (record.role as UserRole) || 'usuario',
      approved: true,
      approvalStatus: 'aprovado',
      created: record.created,
      updated: record.updated,
    }
  },

  async rejectUser(id: string): Promise<UserProfile> {
    const record = await pb.collection('users').update(id, {
      approved: false,
      approvalStatus: 'rejeitado',
    })
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      role: (record.role as UserRole) || 'usuario',
      approved: false,
      approvalStatus: 'rejeitado',
      created: record.created,
      updated: record.updated,
    }
  },

  async updateUserRole(id: string, role: UserRole): Promise<UserProfile> {
    const record = await pb.collection('users').update(id, { role })
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      role: (record.role as UserRole) || 'usuario',
      approved: Boolean(record.approved),
      approvalStatus:
        (record.approvalStatus as UserApprovalStatus) ||
        (record.approved ? 'aprovado' : 'pendente'),
      created: record.created,
      updated: record.updated,
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    return await pb.collection('users').delete(id)
  },
}

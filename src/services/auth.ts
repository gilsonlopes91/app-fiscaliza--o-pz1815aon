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
  mustChangePassword?: boolean
  avatar?: string
  created: string
  updated: string
}

function mapRecordToProfile(model: any): UserProfile {
  return {
    id: model.id,
    email: model.email,
    name: model.name || model.email?.split('@')[0] || 'Usuário',
    role: (model.role as UserRole) || 'usuario',
    approved: Boolean(model.approved),
    approvalStatus:
      (model.approvalStatus as UserApprovalStatus) || (model.approved ? 'aprovado' : 'pendente'),
    mustChangePassword: Boolean(model.must_change_password),
    avatar: model.avatar ? pb.files.getURL(model, model.avatar) : undefined,
    created: model.created,
    updated: model.updated,
  }
}

/**
 * Gera uma senha provisória aleatória e segura atendendo aos requisitos mínimos:
 * Letras maiúsculas, minúsculas, números e caracteres especiais legíveis.
 */
export function generateProvisionalPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*'
  let result = ''
  // Garante ao menos 1 maiúscula, 1 minúscula, 1 dígito e 1 caractere especial
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowers = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%&*'

  result += uppers[Math.floor(Math.random() * uppers.length)]
  result += lowers[Math.floor(Math.random() * lowers.length)]
  result += digits[Math.floor(Math.random() * digits.length)]
  result += symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = result.length; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }

  // Embaralha
  return result
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

export const authService = {
  getCurrentUser(): UserProfile | null {
    const model = pb.authStore.record
    if (!model) return null
    return mapRecordToProfile(model)
  },

  async login(email: string, password: string): Promise<UserProfile> {
    const authData = await pb.collection('users').authWithPassword(email.trim(), password)
    return mapRecordToProfile(authData.record)
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
      must_change_password: false,
    })

    return mapRecordToProfile(record)
  },

  logout(): void {
    pb.authStore.clear()
  },

  async refreshAuth(): Promise<UserProfile | null> {
    if (!pb.authStore.isValid) return null
    try {
      const authData = await pb.collection('users').authRefresh()
      return mapRecordToProfile(authData.record)
    } catch {
      pb.authStore.clear()
      return null
    }
  },

  /**
   * Usuário autenticado define uma nova senha e limpa a flag must_change_password.
   */
  async changePassword(password: string, passwordConfirm: string): Promise<UserProfile> {
    const current = pb.authStore.record
    if (!current?.id) {
      throw new Error('Nenhum usuário logado para alterar senha.')
    }

    const updated = await pb.collection('users').update(current.id, {
      password,
      passwordConfirm,
      must_change_password: false,
    })

    return mapRecordToProfile(updated)
  },
}

export const usersService = {
  async getAll(): Promise<UserProfile[]> {
    const records = await pb.collection('users').getFullList({
      sort: '-created',
    })
    return records.map(mapRecordToProfile)
  },

  async approveUser(id: string): Promise<UserProfile> {
    const record = await pb.collection('users').update(id, {
      approved: true,
      approvalStatus: 'aprovado',
    })
    return mapRecordToProfile(record)
  },

  async rejectUser(id: string): Promise<UserProfile> {
    const record = await pb.collection('users').update(id, {
      approved: false,
      approvalStatus: 'rejeitado',
    })
    return mapRecordToProfile(record)
  },

  async updateUserRole(id: string, role: UserRole): Promise<UserProfile> {
    const record = await pb.collection('users').update(id, { role })
    return mapRecordToProfile(record)
  },

  /**
   * Redefine a senha de um usuário para uma senha provisória aleatória e
   * marca must_change_password = true para forçar troca no próximo acesso.
   * Retorna a senha provisória gerada e o perfil atualizado.
   */
  async resetUserPassword(id: string): Promise<{ provisionalPassword: string; user: UserProfile }> {
    const provisionalPassword = generateProvisionalPassword(10)

    const updated = await pb.collection('users').update(id, {
      password: provisionalPassword,
      passwordConfirm: provisionalPassword,
      must_change_password: true,
    })

    return {
      provisionalPassword,
      user: mapRecordToProfile(updated),
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    return await pb.collection('users').delete(id)
  },
}

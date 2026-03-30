import { useAuthStore } from '../stores/auth-store'

export function useCurrentUser() {
  return useAuthStore((state) => state.user)
}

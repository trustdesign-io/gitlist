import { create } from 'zustand'

interface GithubState {
  githubUsername: string | null
  isPatLinked: boolean
  isLoading: boolean
  setGithubAccount: (username: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useGithubStore = create<GithubState>((set) => ({
  githubUsername: null,
  isPatLinked: false,
  isLoading: true,
  setGithubAccount: (username) =>
    set({ githubUsername: username, isPatLinked: username !== null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}))

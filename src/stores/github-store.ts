import { create } from 'zustand'

interface GithubState {
  githubUsername: string | null
  isPatLinked: boolean
  /** True while the initial PAT check is in progress. */
  isLoading: boolean
  /**
   * Called once the PAT check resolves.
   * Pass null to indicate no linked account.
   */
  setGithubAccount: (username: string | null) => void
}

export const useGithubStore = create<GithubState>((set) => ({
  githubUsername: null,
  isPatLinked: false,
  isLoading: true,
  setGithubAccount: (username) =>
    set({ githubUsername: username, isPatLinked: username !== null, isLoading: false }),
}))

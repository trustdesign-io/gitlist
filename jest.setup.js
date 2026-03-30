// Mock expo's ImportMetaRegistry which uses lazy require() inside a global
// getter — this causes "outside of scope" errors in Jest when the getter fires
// during module evaluation.
jest.mock('expo/src/winter/ImportMetaRegistry', () => ({
  ImportMetaRegistry: { url: null },
}))

// Result files belong to one workflow run and attempt, never to the source tree.
export function runIdentity(env = process.env) {
  return {
    repository: env.GITHUB_REPOSITORY || "local",
    id: env.GITHUB_RUN_ID || "local",
    attempt: env.GITHUB_RUN_ATTEMPT || "1",
    sha: env.GITHUB_SHA || "local",
    event: env.GITHUB_EVENT_NAME || "local",
  };
}

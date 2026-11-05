import { existsSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const projectRoot = path.resolve(import.meta.dirname, "..")

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context)
  }

  if (specifier.startsWith("@/")) {
    const basePath = path.join(projectRoot, specifier.slice(2))
    const candidates = [
      basePath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      `${basePath}.js`,
      path.join(basePath, "index.ts"),
      path.join(basePath, "index.tsx"),
    ]
    const match = candidates.find((candidate) => existsSync(candidate))
    if (match) return { url: pathToFileURL(match).href, shortCircuit: true }
  }

  return nextResolve(specifier, context)
}

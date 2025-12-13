import { readdirSync, existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { projRoot } from './paths'

interface WorkspacePackage {
  dir: string
  manifest: {
    name?: string
    version?: string
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
  }
}

// 简单的 workspace 包查找实现，替代 @pnpm/find-workspace-packages
export const getWorkspacePackages = async (): Promise<WorkspacePackage[]> => {
  const packages: WorkspacePackage[] = []
  const workspaceDirs = ['packages', 'internal']

  for (const wsDir of workspaceDirs) {
    const wsPath = join(projRoot, wsDir)
    if (!existsSync(wsPath)) continue

    const dirs = readdirSync(wsPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)

    for (const dir of dirs) {
      const pkgPath = join(wsPath, dir, 'package.json')
      if (existsSync(pkgPath)) {
        const manifest = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        packages.push({
          dir: join(wsPath, dir),
          manifest
        })
      }
    }
  }

  // 添加 play 和 docs
  for (const dir of ['play', 'docs']) {
    const pkgPath = join(projRoot, dir, 'package.json')
    if (existsSync(pkgPath)) {
      const manifest = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      packages.push({
        dir: join(projRoot, dir),
        manifest
      })
    }
  }

  return packages
}

export const getWorkspaceNames = async (dir = projRoot) => {
  const pkgs = await getWorkspacePackages()
  return pkgs
    .filter((pkg) => pkg.dir.startsWith(dir))
    .map((pkg) => pkg.manifest.name)
    .filter((name): name is string => !!name)
}

export const getPackageManifest = (pkgPath: string) => {
  return JSON.parse(readFileSync(pkgPath, 'utf-8'))
}

export const getPackageDependencies = (
  pkgPath: string
): Record<'dependencies' | 'peerDependencies', string[]> => {
  const manifest = getPackageManifest(pkgPath)
  const { dependencies = {}, peerDependencies = {} } = manifest

  return {
    dependencies: Object.keys(dependencies),
    peerDependencies: Object.keys(peerDependencies),
  }
}

export const excludeFiles = (files: string[]) => {
  const excludes = ['node_modules', 'test', 'mock', 'gulpfile', 'dist']
  return files.filter((path) => {
    const position = path.startsWith(projRoot) ? projRoot.length : 0
    return !excludes.some((exclude) => path.includes(exclude, position))
  })
}

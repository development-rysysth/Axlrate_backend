# pnpm Workspace Setup

## ✅ Optimized Configuration

The project is now properly configured as a **pnpm workspace** with optimized dependency management.

## Configuration

### `.npmrc` Settings

- `shamefully-hoist=true` - Hoists all dependencies to root `node_modules`
- `link-workspace-packages=true` - Enables workspace protocol for inter-package dependencies
- `public-hoist-pattern[]` - Hoists common dev tools (TypeScript, ESLint, etc.) to root

### Workspace Structure

```
axlrate-backend/
├── node_modules/          # All dependencies hoisted here (153MB)
├── pnpm-lock.yaml         # Lock file for all workspaces
├── pnpm-workspace.yaml    # Workspace configuration
├── services/
│   ├── auth-service/      # No node_modules (or minimal symlinks)
│   ├── serpapi-service/   # No node_modules (or minimal symlinks)
│   └── ...
└── shared/                # No node_modules (or minimal symlinks)
```

## How It Works

1. **Root Installation**: All dependencies are installed in root `node_modules/`
2. **Symlinks**: pnpm creates minimal symlinks in service directories if needed (for compatibility)
3. **Resolution**: Services resolve dependencies from root `node_modules/` via Node.js module resolution
4. **Workspace Protocol**: Services can reference each other using `workspace:*` protocol

## Benefits

✅ **Disk Space**: Single copy of dependencies (153MB total vs ~500MB+ with separate installs)
✅ **Consistency**: All services use same dependency versions
✅ **Performance**: Faster installs and better caching
✅ **Maintainability**: Single `pnpm-lock.yaml` for entire monorepo

## Commands

### Install all dependencies
```bash
pnpm install
```

### Install dependency in specific service
```bash
pnpm --filter @axlrate/auth-service add express
```

### Install dependency in all services
```bash
pnpm --filter '*' add -D typescript
```

### Run script in specific service
```bash
pnpm --filter @axlrate/auth-service dev
```

### Build all services
```bash
pnpm run build
```

## Service-Level node_modules

**Note**: pnpm may create minimal `node_modules` directories in services (20KB each). These are:
- **Symlinks only** - Not actual packages
- **Optional** - Can be safely removed, dependencies still work
- **Auto-recreated** - pnpm recreates them if needed

If you see service-level `node_modules`, they're just symlinks pointing to root. The actual packages (153MB) are in the root `node_modules/`.

## Verification

To verify the setup is working:

```bash
# Check workspace packages
pnpm list --depth=0

# Test dependency resolution from service
cd services/auth-service
node -e "require('express'); console.log('✓ Dependencies resolved')"
```

## Troubleshooting

### If dependencies don't resolve:
1. Remove all `node_modules`: `rm -rf node_modules services/*/node_modules shared/node_modules`
2. Remove lock file: `rm pnpm-lock.yaml`
3. Reinstall: `pnpm install`

### If you see large service-level node_modules:
- Check if `shamefully-hoist=true` is in `.npmrc`
- Remove service node_modules and reinstall from root
- Verify with: `du -sh services/*/node_modules` (should be < 50KB each)


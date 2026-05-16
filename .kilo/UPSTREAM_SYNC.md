# Upstream Sync Notes for Calibre-Web Fork

## Problem Statement
When syncing changes from upstream (janeczku/calibre-web) to our fork, will our custom modifications be overwritten?

## Answer: Depends on Sync Method

### ❌ WHAT WOULD WIPE CHANGES
```bash
# These commands RESET your branch to match upstream exactly
git reset --hard upstream/main
git checkout --force upstream/main
```
Your committed changes and uncommitted work would be lost.

### ✅ SAFE SYNC METHODS

**Method 1: Merge (preserves history)**
```bash
git fetch upstream
git merge upstream/main
# Resolve any conflicts manually if they occur
```

**Method 2: Rebase (cleaner linear history)**
```bash
git fetch upstream
git rebase upstream/main
# Your commits will be replayed on top of upstream
```

**Method 3: Stash for uncommitted changes**
```bash
git stash                    # Save local changes temporarily
git fetch upstream
git merge upstream/main
git stash pop               # Restore your local changes
```

## What Happens to Commits?
- Your committed changes remain as commits in your history
- They are NOT automatically removed by merging upstream
- When viewing `git log`, you'll see upstream commits + your commits

## Merge Conflicts
If upstream modifies the same files/lines you modified, git will report a conflict:
- You'll need to manually decide which version to keep
- The conflict resolution process allows you to keep your changes, upstream changes, or both

## Best Practices
1. Always commit your changes before syncing
2. Create a backup branch if concerned: `git branch backup-before-sync`
3. Test the merged result before deploying

## For This Repository (Taratsa Fork)
- Upstream: https://github.com/janeczku/calibre-web
- Our remote: https://github.com/Taratsa/calibre-web
- Branch: taratsa (contains all our custom modifications)
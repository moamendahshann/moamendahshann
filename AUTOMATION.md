# Automatic project table

GitHub Actions refreshes the marked project table hourly, at minute 17, and can also be run from Actions → Update project table → Run workflow. Schedule execution can be delayed by GitHub; this is polling, not an immediate repository-creation event. It works while the owner's computer is off.

The script lists the owner's public repositories, follows pagination, and includes original active projects. It excludes private repositories, forks, archived or disabled repositories, and the profile repository itself. Four featured projects appear first; other projects follow by creation date, newest first. No personal access token or external service is required.

Project names, descriptions, main language and Website links come from GitHub. To give a new project a better description or a live-demo link, edit its About section. Set a Website to make the table link to its demo automatically.

`projects.config.json` controls featured order, exclusions and optional display titles or custom stack labels. New projects require no config change. Only content between `<!-- PROJECTS:START -->` and `<!-- PROJECTS:END -->` in README.md is replaced. Edit the bio, experience and other sections normally outside those markers.

The workflow runs unit tests before writing. API errors, incomplete pagination or missing/duplicate markers cause failure rather than erasing the table. No commit is created when content has not changed. Commits only touch README.md; pushes never force or overwrite concurrent changes.

To test locally with Node.js 24: `node --test tests/update-projects.test.mjs`. To refresh locally: `node scripts/update-projects.mjs`. Optional `GITHUB_TOKEN` increases the API allowance and is read from the environment only.

GitHub can disable scheduled workflows on inactive public repositories. If updates stop, check the Actions page, re-enable the workflow if needed, and run it manually. The workflow status is the source of truth for successful refreshes.

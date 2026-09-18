import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
// Pages accepts only the root wrangler.toml. Stage the explicit preview
// configuration for the command, then restore the local file even on failure.
const local = await readFile('wrangler.toml', 'utf8');
const preview = await readFile('wrangler.preview.toml', 'utf8');
if (!preview.includes('name = "sarbath-club-preview"') || !preview.includes('GAME_ENABLED = "false"')) throw new Error('Unexpected preview target or enablement state.');
let status=1;
try {
  await writeFile('wrangler.toml', preview);
  const command = spawnSync(process.execPath, ['node_modules/wrangler/wrangler-dist/cli.js','pages','deploy','dist','--project-name','sarbath-club-preview','--branch','main'], {stdio:'inherit',env:{...process.env,CLOUDFLARE_ACCOUNT_ID:'2bbb5d7a6d1b537e5e61c8138c5275a6'}});
  status=command.status ?? 1;
} finally { await writeFile('wrangler.toml', local); }
process.exitCode=status;

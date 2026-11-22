import fs from 'node:fs';
import path from 'node:path';

const localBrowsers=path.resolve('storage','browsers');
if(!process.env.PLAYWRIGHT_BROWSERS_PATH&&fs.existsSync(localBrowsers)&&fs.readdirSync(localBrowsers).some(name=>name.startsWith('chromium-'))){
  process.env.PLAYWRIGHT_BROWSERS_PATH=localBrowsers;
}

import config from './src/payload.config.ts';
import { getPayload } from 'payload';
async function test() {
  const payload = await getPayload({ config });
  console.log(Object.keys(payload).filter(k => k.toLowerCase().includes('email') || k.toLowerCase().includes('verify')));
  process.exit(0);
}
test();

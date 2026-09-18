import { primary, cleanup } from '../server/core.js';
export default {
  async scheduled(_event, env, context) {
    // Remote cleanup uses only an explicitly approved retention policy.
    const db=primary(env.DB);
    const config=await db.prepare('SELECT approved FROM config WHERE id=1').first();
    if(config?.approved===1) context.waitUntil(cleanup(db));
  },
  fetch(){return new Response('Not found',{status:404});}
};

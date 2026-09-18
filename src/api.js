export const messages = {
  win_required: 'Only a winning play can claim a reward.',
  active_coupon: 'Your phone already has a coupon within its validity period. Claim again after it expires.',
  verification_failed: "We couldn't verify your request. Refresh and try again.",
  high_latency: 'The timing check could not stabilize. Please try again. If it keeps happening, try another connection.',
  connection_check_required: 'Please check your connection and try again.',
  too_many_requests: 'Lots of requests right now. Try again in a moment.',
  invalid_input: 'Please check the details you entered.',
  configuration_required: 'The game is being set up. Please ask staff for help.',
  game_unavailable: 'The challenge is not open yet. Check back soon.',
  unauthorized: 'Please sign in again.',
  coupon_expired: 'This coupon has expired.',
  invalid_coupon: 'No valid coupon found.',
  invalid_session: 'This play could not be found. Please ask staff for help.'
};
export async function api(path, data, credential) {
  let response;
  try { response = await fetch(`/api/${path}`, { method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(credential ? { Authorization: `Bearer ${credential}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) }); }
  catch { throw Object.assign(new Error('Connection problem. Check your signal, then recover this play.'), { key: 'network_error' }); }
  let result; try { result = await response.json(); } catch { throw Object.assign(new Error('The server response was interrupted. Recover this play.'), { key: 'network_error' }); }
  if (!response.ok) throw Object.assign(new Error(messages[result.error] || 'Something went wrong. Please try again in a moment.'), { key: result.error });
  return result;
}
export async function sampleConnection() {
  const samples = [];
  // Retry transient service/network spikes without widening server timing limits.
  for (let i = 0; i < 9; i++) {
    const challenge = await api('ping', {});
    samples.push((await api('ping', { challenge: challenge.challenge })).sample);
    if (samples.length >= 3) {
      const recent = samples.slice(-3), sorted = [...recent].sort((a,b)=>a-b);
      if (sorted[1] <= 1000 && sorted[2] - sorted[0] <= 150) return recent;
    }
  }
  throw Object.assign(new Error(messages.high_latency), { key: 'high_latency' });
}

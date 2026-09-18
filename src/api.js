export const messages = {
  already_played: "You've already played today. Come back tomorrow!",
  verification_failed: "We couldn't verify your request. Refresh and try again.",
  high_latency: 'Your connection seems slow or unstable. Try a stronger connection.',
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
  for (let i = 0; i < 3; i++) { const challenge = await api('ping', {}); samples.push((await api('ping', { challenge: challenge.challenge })).sample); }
  return samples;
}

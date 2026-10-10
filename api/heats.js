const ENDPOINT = 'https://data-eu.swimify.com/v1/graphql';
const DEFAULT_COMPETITION = process.env.COMPETITION_ID || '0e7de999-e30c-48fe-9e6e-599eb2fe05aa';
const KEY = process.env.SWIMIFY_API_KEY;

const heatsQuery = `query competitionHeats($competitionId: uuid!) {
  heat(
    where: {time_program_entry: {round: {event: {competition_id: {_eq: $competitionId}}}}}
    order_by: [{id: asc}]
    limit: 1000
  ) {
    id name number status estimated_start_time start_time
    time_program_entry {
      name type
      round { name event { id name number } }
    }
  }
}`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  const origin = req.headers.origin || '';
  const allowed = origin === 'https://ripsmooth.github.io' || /^https?:\/\/localhost(?::\d+)?$/.test(origin);
  if (allowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ok:false,error:'Method not allowed'});
  if (!KEY) return res.status(503).json({ok:false,error:'SWIMIFY_API_KEY puuttuu Vercelin Environment Variables -asetuksista.'});
  const competitionId = String(req.query?.competition || DEFAULT_COMPETITION).trim();
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-public-secret-key': KEY,
        'origin': 'https://live.swimify.com',
        'referer': 'https://live.swimify.com/'
      },
      body: JSON.stringify({query:heatsQuery,variables:{competitionId}})
    });
    const raw = await response.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { throw new Error(`Swimify HTTP ${response.status}: ${raw.slice(0,250)}`); }
    if (!response.ok || payload.errors?.length) {
      throw new Error(payload.errors?.map(e=>e.message).join('; ') || `Swimify HTTP ${response.status}`);
    }
    const heats = (payload.data?.heat || []).map(h => ({
      id: h.id,
      number: h.number,
      name: h.name,
      status: h.status,
      estimated_start_time: h.estimated_start_time,
      start_time: h.start_time,
      eventName: h.time_program_entry?.round?.event?.name || '',
      eventNumber: h.time_program_entry?.round?.event?.number ?? '',
      roundName: h.time_program_entry?.round?.name || '',
      programName: h.time_program_entry?.name || ''
    }));
    return res.status(200).json({ok:true,competitionId,heats});
  } catch (e) {
    return res.status(502).json({ok:false,error:`Erälistan haku epäonnistui: ${e.message}`});
  }
};

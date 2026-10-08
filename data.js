const ENDPOINT = 'https://data-eu.swimify.com/v1/graphql';
const COMPETITION = process.env.COMPETITION_ID || '0e7de999-e30c-48fe-9e6e-599eb2fe05aa';
const KEY = process.env.SWIMIFY_API_KEY;

let lastHeatId = null;
let lastEventId = null;
let lastRoundId = null;

const currentQuery = `query currentHeatIdsQuery_WL($id: uuid!) {
  current_heat(where: {competition_id: {_eq: $id}}) {
    heat_type
    heat { id status }
  }
}`;

const heatQuery = `query heatByIdQuery_WL($id: Int!) {
  heat_by_pk(id:$id) {
    id name number status estimated_start_time start_time
    lanes(order_by:{number:asc}) {
      id number heat_rank qualification entry_time_text reaction_time result_text
      fina_points wps_points dns dnf dsq dq_code dq_relay_swimmer note swimmed_distance not_in_competition
      competitor {
        id oid code is_relay full_name first_name last_name full_name_reversed birthday age country_code is_para
        para_class_free para_class_breast para_class_medley not_in_competition
        club { id oid code name short_name country_code }
      }
      relay_competitors(order_by:{order:asc}) {
        id oid order competitor { id oid first_name last_name full_name birthday age }
      }
      sub_results(order_by:{order:asc}) {
        id done_at order split_diff_text result_value_text result_value split_diff take_over
      }
    }
    time_program_entry {
      id oid name type
      round {
        id name
        event { id name number is_relay is_para_event distance athlete_count event_competition_level event_type }
      }
    }
  }
}`;

const nearbyQuery = `query nearbyHeats($startId:Int!) {
  heat(where:{id:{_gte:$startId}} order_by:{id:asc} limit:12) {
    id number status
    time_program_entry { round { id event { id number name } } }
  }
}`;

async function gql(query, variables) {
  if (!KEY) throw new Error('SWIMIFY_API_KEY puuttuu Vercelin Environment Variables -asetuksista.');
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hasura-public-secret-key': KEY,
      'origin': 'https://live.swimify.com',
      'referer': 'https://live.swimify.com/'
    },
    body: JSON.stringify({query, variables})
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Swimify HTTP ${r.status}: ${text.slice(0,300)}`); }
  if (!r.ok) throw new Error(`Swimify HTTP ${r.status}: ${data?.errors?.map(x=>x.message).join('; ') || 'virhe'}`);
  if (data.errors?.length) throw new Error(data.errors.map(x=>x.message).join('; '));
  return data.data;
}

async function getHeat(id) { return (await gql(heatQuery, {id:Number(id)})).heat_by_pk; }

async function getAutoHeat() {
  const d = await gql(currentQuery, {id:COMPETITION});
  const rows = Array.isArray(d.current_heat) ? d.current_heat : [];
  if (!rows.length) return null;
  const candidates = [];
  for (const row of rows) {
    if (!row?.heat?.id) continue;
    try { const h = await getHeat(row.heat.id); if (h) candidates.push(h); } catch (_) {}
  }
  if (!candidates.length) return null;

  if (lastHeatId) {
    const same = candidates.find(h => Number(h.id) === Number(lastHeatId));
    if (same) return same;
  }

  if (lastHeatId && lastEventId && lastRoundId) {
    try {
      const near = await gql(nearbyQuery, {startId:Number(lastHeatId)+1});
      for (const n of (near.heat || [])) {
        const ev=n?.time_program_entry?.round?.event;
        const rd=n?.time_program_entry?.round;
        if (Number(ev?.id)===Number(lastEventId) && Number(rd?.id)===Number(lastRoundId) && Number(n.id)>Number(lastHeatId)) {
          const h=await getHeat(n.id); if(h) return h;
        }
      }
    } catch (_) {}
  }

  const running = candidates.filter(h => /RUN|SWIM|START|ACTIVE|IN_PROGRESS|INPROGRESS/i.test(String(h.status||'')));
  if (running.length) return running.sort((a,b)=>Number(a.id)-Number(b.id))[0];
  if (candidates.length===1) return candidates[0];
  const greater=candidates.filter(h=>Number(h.id)>Number(lastHeatId||-Infinity)).sort((a,b)=>Number(a.id)-Number(b.id));
  if(greater.length) return greater[0];
  return candidates.sort((a,b)=>Number(b.id)-Number(a.id))[0];
}

module.exports = async (req,res) => {
  const origin = req.headers.origin || '';
  const allowed = origin === 'https://ripsmooth.github.io' || /^https?:\/\/localhost(?::\d+)?$/.test(origin);
  if (allowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'Method not allowed'});
  try {
    const h=await getAutoHeat();
    if(!h) return res.status(200).json({ok:true,message:'Aktiivista erää ei löytynyt juuri nyt.',heat:null});
    lastHeatId=Number(h.id);
    lastRoundId=Number(h?.time_program_entry?.round?.id)||null;
    lastEventId=Number(h?.time_program_entry?.round?.event?.id)||null;
    return res.status(200).json({ok:true,message:'OK',heat:h});
  } catch(e) {
    return res.status(502).json({ok:false,error:e.message});
  }
};

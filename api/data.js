const ENDPOINT = 'https://data-eu.swimify.com/v1/graphql';
const DEFAULT_COMPETITION = process.env.COMPETITION_ID || '0e7de999-e30c-48fe-9e6e-599eb2fe05aa';
const KEY = process.env.SWIMIFY_API_KEY;

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

async function gql(query, variables) {
  if (!KEY) throw new Error('SWIMIFY_API_KEY puuttuu Vercelin Environment Variables -asetuksista.');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hasura-public-secret-key': KEY
    },
    body: JSON.stringify({query, variables})
  });

  const body = await response.text();
  let json;
  try { json = JSON.parse(body); }
  catch (_) { throw new Error(`Swimify HTTP ${response.status}: vastaus ei ole JSONia.`); }

  if (!response.ok) throw new Error(`Swimify HTTP ${response.status}`);
  if (Array.isArray(json.errors) && json.errors.length) {
    throw new Error(json.errors.map(x => x.message).join('; '));
  }
  return json.data;
}

async function getHeat(id) {
  const data = await gql(heatQuery, {id:Number(id)});
  return data?.heat_by_pk || null;
}

async function getAutoHeat(competitionId) {
  const data = await gql(currentQuery, {id:competitionId});
  const rows = Array.isArray(data?.current_heat) ? data.current_heat : [];
  const candidates = [];

  for (const row of rows) {
    if (!row?.heat?.id) continue;
    try {
      const heat = await getHeat(row.heat.id);
      if (heat) candidates.push(heat);
    } catch (_) {}
  }

  if (!candidates.length) return null;

  const running = candidates.filter(h =>
    /RUN|SWIM|START|ACTIVE|IN_PROGRESS|INPROGRESS/i.test(String(h.status || ''))
  );

  if (running.length) return running.sort((a,b) => Number(a.id)-Number(b.id))[0];
  return candidates.sort((a,b) => Number(b.id)-Number(a.id))[0];
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ok:false,error:'Method not allowed'});

  try {
    const url = new URL(req.url, 'https://uintilive.vercel.app');
    const competitionId = url.searchParams.get('competition')?.trim() || DEFAULT_COMPETITION;

    const heat = await getAutoHeat(competitionId);

    if (!heat) {
      return res.status(200).json({
        ok:true,
        message:'Aktiivista erää ei löytynyt juuri nyt.',
        heat:null
      });
    }

    return res.status(200).json({ok:true,message:'OK',heat});
  } catch (e) {
    return res.status(502).json({
      ok:false,
      error:e?.message || 'Tuntematon palvelinvirhe'
    });
  }
}

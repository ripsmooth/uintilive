const DEFAULT_COMPETITION = process.env.COMPETITION_ID || '0e7de999-e30c-48fe-9e6e-599eb2fe05aa';
const KEY='swimify_manual_control';

async function redis(path, method='GET') {
  const url=process.env.UPSTASH_REDIS_REST_URL, token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url || !token) throw new Error('Verceliin puuttuvat UPSTASH_REDIS_REST_URL ja UPSTASH_REDIS_REST_TOKEN.');
  const r=await fetch(url.replace(/\/$/,'')+path,{method,headers:{Authorization:'Bearer '+token}});
  const d=await r.json();
  if(!r.ok) throw new Error(d.error || 'Redis-virhe');
  return d;
}

module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS') return res.status(204).end();
  try {
    if(req.method==='GET') {
      const d=await redis('/get/'+KEY);
      let state;
      try { state=d.result ? JSON.parse(d.result) : null; } catch { state=null; }
      return res.status(200).json({ok:true,state:state || {mode:'auto',heatId:null,competitionId:DEFAULT_COMPETITION}});
    }
    if(req.method!=='POST') return res.status(405).json({ok:false,error:'Method not allowed'});
    const token=process.env.CONTROL_PANEL_TOKEN;
    if(!token) return res.status(503).json({ok:false,error:'Verceliin puuttuu CONTROL_PANEL_TOKEN.'});
    if(String(req.headers['x-control-token']||'')!==token) return res.status(401).json({ok:false,error:'Ohjauspaneelin tunnus on väärä.'});
    const body=typeof req.body==='string' ? JSON.parse(req.body) : (req.body||{});
    const mode=body.mode==='manual'?'manual':'auto';
    const heatId=body.heatId==null || body.heatId==='' ? null : Number(body.heatId);
    if(mode==='manual' && (!Number.isInteger(heatId)||heatId<=0)) return res.status(400).json({ok:false,error:'Anna kelvollinen erän ID-numero.'});
    const state={mode,heatId:mode==='manual'?heatId:null,competitionId:String(body.competitionId||DEFAULT_COMPETITION),updatedAt:new Date().toISOString()};
    await redis('/set/'+KEY+'/'+encodeURIComponent(JSON.stringify(state)),'GET');
    return res.status(200).json({ok:true,state});
  } catch(e) { return res.status(500).json({ok:false,error:e.message}); }
};

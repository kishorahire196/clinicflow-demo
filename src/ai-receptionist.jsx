import { useState, useRef, useEffect, useCallback } from "react";

// ── CLINIC CONFIG ──────────────────────────────────────────────────────────
const CLINIC = {
  name:      "Dr. Kishor Ahire Dental Clinic",
  doctor:    "Dr. Kishor Ahire",
  tagline:   "Your Smile, Our Passion",
  phone:     "7208546917",
  whatsapp:  "917208546917",
  address:   "RAINART APARTMENT, Vartak Nagar, Thane West, Thane, Maharashtra 400606",
  maps:      "https://maps.google.com/?q=RAINART+APARTMENT+Vartak+Nagar+Thane+West+Maharashtra+400606",
  services:  [
    "Dental Implants","Root Canal Treatment","Teeth Whitening",
    "Smile Designing","Dental Crowns & Bridges","Teeth Cleaning",
    "Wisdom Tooth Removal","Orthodontics / Braces","Invisible Aligners",
    "Paediatric Dentistry","Laser Dentistry","Maxillofacial Surgery",
    "Zirconia Crowns","Gum Treatment","Dentures",
  ],
  hours: {
    "Mon–Sat": "9:00 AM – 1:00 PM  |  5:00 PM – 9:00 PM",
    "Sunday":  "10:00 AM – 1:00 PM (Emergency only)",
  },
  established: "2018",
  experience:  "6+ Years",
};

const C = {
  primary:    "#0A7B6C",
  primary2:   "#0D9488",
  dark:       "#064E3B",
  light:      "#E6F7F5",
  lighter:    "#F0FBF9",
  white:      "#FFFFFF",
  offWhite:   "#F8FFFE",
  text:       "#0F2923",
  textMid:    "#3D6B63",
  textLight:  "#7BA89F",
  border:     "#C8E8E4",
  gold:       "#D97706",
  goldLight:  "#FEF3C7",
  red:        "#DC2626",
  redLight:   "#FEF2F2",
  green:      "#16A34A",
  greenLight: "#F0FDF4",
  wa:         "#25D366",
  waLight:    "#DCFCE7",
  call:       "#2563EB",
  callLight:  "#EFF6FF",
};

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the official AI Receptionist of ${CLINIC.name}, Thane West.
Doctor: ${CLINIC.doctor} | Phone: ${CLINIC.phone} | WhatsApp: ${CLINIC.phone}
Address: ${CLINIC.address}
Timings: Mon–Sat 9AM–1PM & 5PM–9PM | Sunday Emergency 10AM–1PM
Services: ${CLINIC.services.join(", ")}

PERSONALITY: Warm, professional, caring — like a real dental clinic receptionist in Thane.
LANGUAGE: Auto-detect Hindi/English/Marathi. Reply naturally in patient's language.
RESPONSE LENGTH: Short, clear, 10–40 words max.

ALWAYS COLLECT when booking:
- Patient full name
- Mobile number  
- Preferred date & time
- Service needed

When you have name OR phone, output at END of message (hidden from patient):
<SAVE_DATA>{"type":"appointment|lead|callback|complaint|inquiry","name":"name","phone":"number","service":"service","date":"date or TBD","time":"time or TBD","notes":"any notes","status":"Confirmed|Pending|Open"}</SAVE_DATA>

APPOINTMENT CONFIRMED format (show patient):
✅ APPOINTMENT CONFIRMED!
━━━━━━━━━━━━━━━━━━━━
🏥 ${CLINIC.name}
👨‍⚕️ ${CLINIC.doctor}
👤 Patient: [name]
🦷 Service: [service]
📅 Date: [date]
⏰ Time: [time]
📍 Vartak Nagar, Thane West
📞 Confirm: ${CLINIC.phone}
━━━━━━━━━━━━━━━━━━━━
We look forward to your visit! 😊

CALLBACK format:
📞 CALLBACK NOTED
Name: [name] | Phone: [number]
Dr. Kishor will call you back shortly!

EMERGENCY: If patient mentions severe pain/swelling/accident — ask them to call ${CLINIC.phone} immediately or visit clinic.

NEVER reveal you are AI unless directly asked. Stay in character always.`;

const CALL_SCRIPT_PROMPT = `Generate a warm, professional Hindi/English phone call script for ${CLINIC.name}.
Doctor: ${CLINIC.doctor}, Thane West.
Keep it under 80 words. Natural mix of Hindi and English is fine.
Format with clear sections: Opening | Purpose | Action | Closing`;

const WA_MSG_PROMPT = `Generate a warm WhatsApp message for ${CLINIC.name} (Dr. Kishor Ahire Dental Clinic, Thane).
Under 70 words. Use 2-3 relevant emojis. Friendly and professional.
End with: "For queries: 7208546917"`;

const QUICK = [
  { l:"📅 Book Appointment", t:"I'd like to book a dental appointment" },
  { l:"🦷 Root Canal",       t:"Tell me about root canal treatment and cost" },
  { l:"✨ Teeth Whitening",  t:"I want teeth whitening — what's the procedure?" },
  { l:"🔩 Dental Implants",  t:"Tell me about dental implants cost and procedure" },
  { l:"😁 Smile Design",     t:"I'm interested in smile designing" },
  { l:"⏰ Timings",          t:"What are the clinic timings and location?" },
  { l:"💰 Fees",             t:"What are the consultation fees?" },
  { l:"🚨 Emergency",        t:"I have severe tooth pain right now" },
];

// ── UTILS ─────────────────────────────────────────────────────────────────
function extractSD(text) {
  if (!text) return { clean: text, data: null };
  const m = text.match(/<SAVE_DATA>([\s\S]*?)<\/SAVE_DATA>/);
  if (!m) return { clean: text, data: null };
  try { return { clean: text.replace(/<SAVE_DATA>[\s\S]*?<\/SAVE_DATA>/, "").trim(), data: JSON.parse(m[1].trim()) }; }
  catch { return { clean: text.replace(/<SAVE_DATA>[\s\S]*?<\/SAVE_DATA>/, "").trim(), data: null }; }
}

async function saveSheet(data) { /* Google Sheets webhook here */ }

async function callClaude(system, msg, max=600) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:max, system, messages:[{role:"user",content:msg}] })
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const d = await res.json();
  return d.content?.filter(b=>b.type==="text").map(b=>b.text).join("") || "";
}

function Fmt({ text }) {
  if (!text) return null;
  return text.split("\n").map((l,i,a) => (
    <span key={i}>{l.split(/\*\*(.*?)\*\*/g).map((p,j)=>j%2===1?<strong key={j}>{p}</strong>:<span key={j}>{p}</span>)}{i<a.length-1&&<br/>}</span>
  ));
}

function useCount(target, dur=2000, go=false) {
  const [v,setV]=useState(0);
  useEffect(()=>{
    if(!go) return;
    let s=null;
    const id=requestAnimationFrame(function f(ts){ if(!s)s=ts; const p=Math.min((ts-s)/dur,1),e=1-Math.pow(1-p,4); setV(Math.floor(e*target)); if(p<1) requestAnimationFrame(f); });
    return()=>cancelAnimationFrame(id);
  },[go,target,dur]);
  return v;
}

function Btn({ children, onClick, style={}, hoverStyle={}, ...props }) {
  const [hov,setHov]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{...style,...(hov?hoverStyle:{})}} {...props}>{children}</button>;
}

// ── CONTACT MODAL (WhatsApp + Call) ───────────────────────────────────────
function ContactModal({ lead, initTab="whatsapp", onClose }) {
  const [tab,setTab]     = useState(initTab);
  const [waMsg,setWaMsg] = useState("");
  const [script,setScript]= useState("");
  const [loading,setLoading]=useState(false);
  const [copied,setCopied]=useState(false);

  const name    = lead?.name    || "Patient";
  const phone   = lead?.phone   || "";
  const service = lead?.service || "dental appointment";
  const date    = lead?.date    || "upcoming";
  const time    = lead?.time    || "scheduled";

  useEffect(()=>{ generate(tab); },[tab]);

  async function generate(t) {
    setLoading(true); setCopied(false);
    const info = `Patient: ${name} | Phone: ${phone} | Service: ${service} | Date: ${date} | Time: ${time}`;
    try {
      if(t==="whatsapp") setWaMsg(await callClaude(WA_MSG_PROMPT, `Generate WhatsApp message for: ${info}`));
      else setScript(await callClaude(CALL_SCRIPT_PROMPT, `Generate call script for: ${info}`));
    } catch { setWaMsg("Error. Try again."); setScript("Error. Try again."); }
    finally { setLoading(false); }
  }

  function copy(text) { navigator.clipboard?.writeText(text).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,zIndex:300,background:"rgba(10,41,35,0.65)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:"520px",background:C.white,borderRadius:"24px",overflow:"hidden",boxShadow:"0 40px 80px rgba(0,0,0,0.25)"}}>
        {/* Header */}
        <div style={{padding:"20px 24px",background:`linear-gradient(135deg,${C.primary},${C.primary2})`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontWeight:800,fontSize:"16px",color:"#fff"}}>Contact Patient</div>
            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.7)",marginTop:"2px"}}>{name}{phone&&` · ${phone}`}</div>
          </div>
          <button onClick={onClose} style={{width:"32px",height:"32px",borderRadius:"50%",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",color:"#fff",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {/* Tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
          {[{id:"whatsapp",icon:"💬",label:"WhatsApp",color:C.wa},{id:"call",icon:"📞",label:"Call Script",color:C.call}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"14px",border:"none",cursor:"pointer",fontWeight:700,fontSize:"14px",background:tab===t.id?C.lighter:C.white,color:tab===t.id?t.color:C.textLight,borderBottom:tab===t.id?`3px solid ${t.color}`:"3px solid transparent",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div style={{padding:"22px"}}>
          {/* WhatsApp */}
          {tab==="whatsapp"&&(
            <div>
              <div style={{marginBottom:"14px",padding:"11px 14px",borderRadius:"12px",background:C.waLight,border:"1px solid #BBF7D0",fontSize:"13px",color:"#064E3B"}}>
                💬 AI ne patient ke liye personalized WhatsApp message banaya hai. Edit karo aur bhejo!
              </div>
              <div style={{marginBottom:"14px"}}>
                <div style={{fontSize:"11px",fontWeight:700,color:C.textMid,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.8px"}}>AI Generated Message</div>
                {loading?(
                  <div style={{padding:"20px",borderRadius:"14px",background:C.lighter,border:`1px solid ${C.border}`,display:"flex",gap:"6px",alignItems:"center",minHeight:"80px"}}>
                    {[0,.2,.4].map((d,j)=><div key={j} style={{width:"8px",height:"8px",borderRadius:"50%",background:C.wa,animation:"typingDot 1.4s ease infinite",animationDelay:`${d}s`}}/>)}
                    <span style={{fontSize:"12px",color:C.textLight,marginLeft:"6px"}}>Generating...</span>
                  </div>
                ):(
                  <textarea value={waMsg} onChange={e=>setWaMsg(e.target.value)} rows={5}
                    style={{width:"100%",padding:"12px 14px",borderRadius:"12px",border:`1.5px solid ${C.border}`,fontSize:"13.5px",color:C.text,fontFamily:"inherit",lineHeight:1.6,resize:"vertical",outline:"none",boxSizing:"border-box",background:C.offWhite,transition:"border-color 0.2s"}}
                    onFocus={e=>e.target.style.borderColor=C.wa} onBlur={e=>e.target.style.borderColor=C.border}/>
                )}
              </div>
              <div style={{display:"flex",gap:"10px"}}>
                <Btn onClick={()=>copy(waMsg)} disabled={loading||!waMsg}
                  style={{flex:1,padding:"11px",borderRadius:"12px",fontSize:"13px",fontWeight:600,background:copied?C.greenLight:C.light,border:`1px solid ${copied?"#BBF7D0":C.border}`,color:copied?C.green:C.primary,cursor:"pointer",transition:"all 0.2s"}}
                  hoverStyle={{background:C.lighter}}>
                  {copied?"✓ Copied!":"📋 Copy"}
                </Btn>
                <a href={`https://wa.me/${phone?phone.replace(/\D/g,""):CLINIC.whatsapp}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer"
                  style={{flex:2,padding:"11px",borderRadius:"12px",fontSize:"14px",fontWeight:700,background:C.wa,color:"#fff",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",boxShadow:"0 4px 14px rgba(37,211,102,0.4)"}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Open WhatsApp
                </a>
              </div>
              <Btn onClick={()=>generate("whatsapp")} style={{width:"100%",marginTop:"10px",padding:"8px",borderRadius:"10px",fontSize:"12px",fontWeight:500,background:"transparent",border:`1px solid ${C.border}`,color:C.textMid,cursor:"pointer"}} hoverStyle={{background:C.lighter}}>
                🔄 Regenerate
              </Btn>
            </div>
          )}
          {/* Call Script */}
          {tab==="call"&&(
            <div>
              <div style={{marginBottom:"14px",padding:"11px 14px",borderRadius:"12px",background:C.callLight,border:"1px solid #BFDBFE",fontSize:"13px",color:"#1E3A8A"}}>
                📞 AI ne call script banaya hai. Patient ko call karo aur yeh script padho — bilkul professional lagega!
              </div>
              <div style={{marginBottom:"14px",padding:"14px 16px",borderRadius:"14px",background:C.lighter,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:"15px",color:C.text}}>{name}</div>
                  <div style={{fontSize:"13px",color:C.textMid,marginTop:"2px"}}>{phone||"No phone saved"}</div>
                  <div style={{fontSize:"12px",color:C.textLight,marginTop:"2px"}}>🦷 {service}</div>
                </div>
                <a href={`tel:${phone||CLINIC.phone}`} style={{padding:"11px 18px",borderRadius:"12px",fontSize:"14px",fontWeight:700,background:C.call,color:"#fff",textDecoration:"none",display:"flex",alignItems:"center",gap:"6px",boxShadow:"0 4px 14px rgba(37,99,235,0.4)"}}>
                  📞 Call Now
                </a>
              </div>
              <div style={{marginBottom:"14px"}}>
                <div style={{fontSize:"11px",fontWeight:700,color:C.textMid,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.8px"}}>AI Call Script</div>
                {loading?(
                  <div style={{padding:"20px",borderRadius:"14px",background:C.callLight,border:"1px solid #BFDBFE",display:"flex",gap:"6px",alignItems:"center",minHeight:"100px"}}>
                    {[0,.2,.4].map((d,j)=><div key={j} style={{width:"8px",height:"8px",borderRadius:"50%",background:C.call,animation:"typingDot 1.4s ease infinite",animationDelay:`${d}s`}}/>)}
                    <span style={{fontSize:"12px",color:"#93C5FD",marginLeft:"6px"}}>Generating...</span>
                  </div>
                ):(
                  <div style={{padding:"16px",borderRadius:"14px",background:C.callLight,border:"1px solid #BFDBFE",fontSize:"13.5px",color:"#1E3A8A",lineHeight:1.75,minHeight:"100px"}}>
                    <Fmt text={script}/>
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:"10px"}}>
                <Btn onClick={()=>copy(script)} disabled={loading||!script}
                  style={{flex:1,padding:"11px",borderRadius:"12px",fontSize:"13px",fontWeight:600,background:copied?C.greenLight:C.light,border:`1px solid ${copied?"#BBF7D0":C.border}`,color:copied?C.green:C.primary,cursor:"pointer",transition:"all 0.2s"}}
                  hoverStyle={{background:C.lighter}}>
                  {copied?"✓ Copied!":"📋 Copy Script"}
                </Btn>
                <a href={`tel:${phone||CLINIC.phone}`}
                  style={{flex:2,padding:"11px",borderRadius:"12px",fontSize:"14px",fontWeight:700,background:C.call,color:"#fff",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",boxShadow:"0 4px 14px rgba(37,99,235,0.4)"}}>
                  📞 Call Patient
                </a>
              </div>
              <Btn onClick={()=>generate("call")} style={{width:"100%",marginTop:"10px",padding:"8px",borderRadius:"10px",fontSize:"12px",fontWeight:500,background:"transparent",border:`1px solid ${C.border}`,color:C.textMid,cursor:"pointer"}} hoverStyle={{background:C.lighter}}>
                🔄 Regenerate Script
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LEADS PANEL ───────────────────────────────────────────────────────────
function LeadsPanel({ leads, onClose, onContact }) {
  const [filter,setFilter]=useState("all");
  const filtered = filter==="all" ? leads : leads.filter(l=>l.type===filter);

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(10,41,35,0.6)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:"560px",maxHeight:"88vh",background:C.white,borderRadius:"24px",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 40px 80px rgba(0,0,0,0.25)"}}>
        {/* Header */}
        <div style={{padding:"20px 24px",background:`linear-gradient(135deg,${C.primary},${C.primary2})`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontWeight:800,fontSize:"16px",color:"#fff"}}>📊 Patient Leads</div>
            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.7)",marginTop:"2px"}}>{leads.length} patients captured this session</div>
          </div>
          <button onClick={onClose} style={{width:"32px",height:"32px",borderRadius:"50%",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",color:"#fff",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {/* Filter tabs */}
        <div style={{display:"flex",padding:"12px 16px",gap:"8px",borderBottom:`1px solid ${C.border}`,flexShrink:0,overflowX:"auto"}}>
          {["all","appointment","lead","callback","complaint","inquiry"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 14px",borderRadius:"20px",fontSize:"12px",fontWeight:600,border:"none",cursor:"pointer",whiteSpace:"nowrap",background:filter===f?C.primary:C.light,color:filter===f?"#fff":C.primary,transition:"all 0.15s"}}>
              {f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}
              {f==="all"?` (${leads.length})`:` (${leads.filter(l=>l.type===f).length})`}
            </button>
          ))}
        </div>
        {/* Leads list */}
        <div style={{overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"40px",color:C.textLight}}>
              <div style={{fontSize:"36px",marginBottom:"12px"}}>📋</div>
              <div style={{fontSize:"14px"}}>No {filter==="all"?"leads":"records"} yet</div>
              <div style={{fontSize:"12px",marginTop:"4px",color:C.textLight}}>Start chatting to capture patient info</div>
            </div>
          ):filtered.map((l,i)=>(
            <div key={i} style={{padding:"16px",borderRadius:"16px",background:C.lighter,border:`1px solid ${C.border}`,transition:"all 0.2s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
                <div>
                  <div style={{fontWeight:800,fontSize:"15px",color:C.text}}>{l.name||"Unknown Patient"}</div>
                  {l.phone&&<div style={{fontSize:"13px",color:C.textMid,marginTop:"2px",display:"flex",alignItems:"center",gap:"4px"}}>📞 {l.phone}</div>}
                </div>
                <span style={{padding:"3px 12px",borderRadius:"20px",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",
                  background:l.type==="appointment"?C.greenLight:l.type==="complaint"?C.redLight:l.type==="callback"?C.callLight:C.goldLight,
                  color:l.type==="appointment"?C.green:l.type==="complaint"?C.red:l.type==="callback"?C.call:C.gold,
                  border:`1px solid ${l.type==="appointment"?"#BBF7D0":l.type==="complaint"?"#FECACA":l.type==="callback"?"#BFDBFE":"#FCD34D"}`}}>
                  {l.type}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"12px"}}>
                {[["🦷",l.service],["📅",l.date],["⏰",l.time],["✅",l.status]].map(([ic,v],j)=>
                  v&&v!=="Unknown"&&v!=="TBD"?(
                    <div key={j} style={{fontSize:"12px",color:C.textMid,display:"flex",gap:"4px",alignItems:"center"}}>
                      <span>{ic}</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</span>
                    </div>
                  ):null
                )}
              </div>
              {l.notes&&<div style={{fontSize:"12px",color:C.textLight,marginBottom:"10px",fontStyle:"italic"}}>📝 {l.notes}</div>}
              {/* Action buttons */}
              <div style={{display:"flex",gap:"8px"}}>
                <Btn onClick={()=>{onContact(l,"whatsapp");onClose();}}
                  style={{flex:1,padding:"9px",borderRadius:"10px",fontSize:"12.5px",fontWeight:700,background:C.waLight,border:"1px solid #BBF7D0",color:C.green,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"5px",transition:"all 0.15s"}}
                  hoverStyle={{background:"#BBF7D0"}}>
                  💬 WhatsApp
                </Btn>
                <Btn onClick={()=>{onContact(l,"call");onClose();}}
                  style={{flex:1,padding:"9px",borderRadius:"10px",fontSize:"12.5px",fontWeight:700,background:C.callLight,border:"1px solid #BFDBFE",color:C.call,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"5px",transition:"all 0.15s"}}
                  hoverStyle={{background:"#BFDBFE"}}>
                  📞 Call
                </Btn>
                <a href={`tel:${l.phone||CLINIC.phone}`}
                  style={{flex:1,padding:"9px",borderRadius:"10px",fontSize:"12.5px",fontWeight:700,background:C.light,border:`1px solid ${C.border}`,color:C.primary,display:"flex",alignItems:"center",justifyContent:"center",gap:"5px",textDecoration:"none",transition:"all 0.15s"}}>
                  📲 Dial
                </a>
              </div>
              <div style={{fontSize:"10px",color:C.textLight,marginTop:"8px"}}>🕐 {l.timestamp}</div>
            </div>
          ))}
        </div>
        {leads.length>0&&(
          <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,background:C.lighter,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:"12px",color:C.textMid,fontWeight:500}}>💾 {leads.length} leads this session</div>
            <div style={{fontSize:"11px",color:C.textLight}}>Connect Google Sheets to auto-save</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CHAT WIDGET ───────────────────────────────────────────────────────────
function ChatWidget({ leads, setLeads, onContact }) {
  const mk=()=>({role:"assistant",content:`🦷 Namaste! Welcome to ${CLINIC.name}.\nI'm your AI Receptionist.\nHow may I assist you today? 😊`,ts:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})});
  const [msgs,setMsgs]   = useState([mk()]);
  const [inp,setInp]     = useState("");
  const [load,setLoad]   = useState(false);
  const [active,setActive]= useState(true);
  const [showQ,setShowQ] = useState(true);
  const [toast,setToast] = useState(null);
  const bot=useRef(null); const iRef=useRef(null);

  useEffect(()=>{ bot.current?.scrollIntoView({behavior:"smooth"}); },[msgs,load]);
  function showT(msg,type="ok"){ setToast({msg,type}); setTimeout(()=>setToast(null),3000); }

  const send=useCallback(async(text)=>{
    const msg=(text||inp).trim(); if(!msg||load||!active) return;
    setShowQ(false);
    const ts=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    const hist=[...msgs,{role:"user",content:msg,ts}];
    setMsgs(hist); setInp(""); setLoad(true);
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1200,system:SYSTEM_PROMPT,messages:hist.map(({role,content})=>({role,content}))})});
      if(!res.ok) throw new Error(`API ${res.status}`);
      const d=await res.json();
      if(!d.content?.length) throw new Error("Empty response");
      const raw=d.content.filter(b=>b.type==="text").map(b=>b.text).join("");
      const {clean,data:sd}=extractSD(raw);
      if(sd){ const e={...sd,timestamp:new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}; setLeads(p=>[...p,e]); await saveSheet(e); showT("✓ Patient data saved!"); }
      setMsgs(p=>[...p,{role:"assistant",content:clean,ts:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]);
    } catch(e){
      setMsgs(p=>[...p,{role:"assistant",content:`Technical issue. Please call us: ${CLINIC.phone}`,ts:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),isErr:true}]);
      showT("Error: "+e.message,"err");
    } finally{ setLoad(false); iRef.current?.focus(); }
  },[inp,load,active,msgs,setLeads]);

  const end=useCallback(()=>{ setActive(false); setMsgs(p=>[...p,{role:"assistant",content:`Thank you for visiting ${CLINIC.name}! 😊\n\nFor appointments: 📞 ${CLINIC.phone}\nWhatsApp: wa.me/${CLINIC.whatsapp}\n\nHave a healthy smile day! 🦷✨`,ts:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]); },[]);
  const reset=useCallback(()=>{ setMsgs([mk()]); setActive(true); setShowQ(true); setInp(""); },[]);
  const ok=active&&!!inp.trim()&&!load;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.offWhite,borderRadius:"22px",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"14px 18px",background:`linear-gradient(135deg,${C.primary},${C.primary2})`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{position:"relative",flexShrink:0}}>
            <div style={{position:"absolute",inset:"-3px",borderRadius:"50%",background:"conic-gradient(from 0deg,rgba(255,255,255,0.8),rgba(255,255,255,0.2),rgba(255,255,255,0.8))",animation:active?"spin 4s linear infinite":"none",opacity:0.5}}/>
            <div style={{position:"relative",width:"46px",height:"46px",borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",border:"2px solid rgba(255,255,255,0.3)"}}>🦷</div>
            {active&&<div style={{position:"absolute",bottom:"1px",right:"1px",width:"11px",height:"11px",borderRadius:"50%",background:"#4ADE80",border:`2px solid ${C.primary}`,boxShadow:"0 0 8px rgba(74,222,128,0.8)"}}/>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:"14px",color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{CLINIC.name}</div>
            <div style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",marginTop:"1px"}}>{CLINIC.doctor} · {active?"Online 24/7":"Session Ended"}</div>
          </div>
          <div style={{display:"flex",gap:"6px",flexShrink:0}}>
            <a href={`https://wa.me/${CLINIC.whatsapp}`} target="_blank" rel="noopener noreferrer" title="WhatsApp"
              style={{width:"32px",height:"32px",borderRadius:"10px",background:"rgba(37,211,102,0.25)",border:"1px solid rgba(37,211,102,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",textDecoration:"none"}}>💬</a>
            <a href={`tel:${CLINIC.phone}`} title="Call Clinic"
              style={{width:"32px",height:"32px",borderRadius:"10px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",textDecoration:"none"}}>📞</a>
            {active
              ?<Btn onClick={end} style={{padding:"5px 12px",borderRadius:"20px",fontSize:"11px",fontWeight:700,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",cursor:"pointer"}} hoverStyle={{background:"rgba(255,255,255,0.25)"}}>End</Btn>
              :<Btn onClick={reset} style={{padding:"5px 12px",borderRadius:"20px",fontSize:"11px",fontWeight:700,background:"rgba(74,222,128,0.2)",border:"1px solid rgba(74,222,128,0.4)",color:"#4ADE80",cursor:"pointer"}} hoverStyle={{background:"rgba(74,222,128,0.3)"}}>New Chat</Btn>
            }
          </div>
        </div>
        {/* Info strip */}
        <div style={{display:"flex",gap:"14px",marginTop:"12px",paddingTop:"10px",borderTop:"1px solid rgba(255,255,255,0.12)"}}>
          {[["📍","Vartak Nagar, Thane"],["⏰","Mon–Sat 9AM–9PM"],["📞",CLINIC.phone]].map(([ic,t],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"11px",color:"rgba(255,255,255,0.65)"}}>
              <span>{ic}</span><span>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {toast&&<div style={{padding:"8px 16px",fontSize:"12px",fontWeight:600,background:toast.type==="ok"?C.greenLight:C.redLight,borderBottom:`1px solid ${toast.type==="ok"?"#BBF7D0":"#FECACA"}`,color:toast.type==="ok"?C.green:C.red,flexShrink:0}}>{toast.type==="ok"?"✓":"⚠"} {toast.msg}</div>}

      {/* Messages */}
      <div role="log" aria-live="polite" style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:"12px",scrollbarWidth:"thin",scrollbarColor:`${C.border} transparent`}}>
        {msgs.map((m,i)=>{
          const isAI=m.role==="assistant";
          const isSt=isAI&&/APPOINTMENT CONFIRMED|CALLBACK NOTED/.test(m.content||"");
          return (
            <div key={i} style={{display:"flex",justifyContent:isAI?"flex-start":"flex-end",alignItems:"flex-end",gap:"8px",animation:"msgIn 0.2s ease forwards"}}>
              {isAI&&<div style={{width:"30px",height:"30px",borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${C.primary},${C.primary2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",boxShadow:`0 2px 8px rgba(10,123,108,0.3)`}}>🦷</div>}
              <div style={{maxWidth:"78%"}}>
                <div style={{padding:isSt?"13px 15px":"10px 15px",borderRadius:isAI?"4px 18px 18px 18px":"18px 4px 18px 18px",fontSize:"13.5px",lineHeight:"1.6",
                  ...(m.isErr?{background:C.redLight,color:C.red,border:`1px solid #FECACA`}
                  :isSt?{background:`linear-gradient(135deg,${C.greenLight},${C.lighter})`,color:"#064E3B",border:`1px solid #BBF7D0`,boxShadow:"0 2px 12px rgba(10,123,108,0.1)"}
                  :isAI?{background:C.white,color:C.text,border:`1px solid ${C.border}`,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}
                  :{background:`linear-gradient(135deg,${C.primary},${C.dark})`,color:"#fff",boxShadow:`0 4px 16px rgba(10,123,108,0.35)`})}}>
                  <Fmt text={m.content}/>
                </div>
                <div style={{fontSize:"10px",color:C.textLight,marginTop:"3px",textAlign:isAI?"left":"right",padding:"0 4px"}}>{m.ts}</div>
              </div>
              {!isAI&&<div style={{width:"30px",height:"30px",borderRadius:"50%",flexShrink:0,background:C.light,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",border:`1px solid ${C.border}`}}>🧑</div>}
            </div>
          );
        })}
        {load&&(
          <div style={{display:"flex",alignItems:"flex-end",gap:"8px"}}>
            <div style={{width:"30px",height:"30px",borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.primary2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px"}}>🦷</div>
            <div style={{padding:"12px 16px",borderRadius:"4px 18px 18px 18px",background:C.white,border:`1px solid ${C.border}`,display:"flex",gap:"5px",alignItems:"center"}}>
              {[0,.18,.36].map((d,j)=><div key={j} style={{width:"7px",height:"7px",borderRadius:"50%",background:C.primary2,animation:"typingDot 1.4s ease-in-out infinite",animationDelay:`${d}s`}}/>)}
            </div>
          </div>
        )}
        <div ref={bot}/>
      </div>

      {/* Quick actions */}
      {showQ&&active&&(
        <div style={{padding:"10px 14px 6px",borderTop:`1px solid ${C.border}`,background:C.white,display:"flex",flexWrap:"wrap",gap:"6px",flexShrink:0}}>
          {QUICK.map((q,i)=>(
            <Btn key={i} onClick={()=>send(q.t)}
              style={{padding:"6px 12px",borderRadius:"20px",fontSize:"11px",fontWeight:600,background:C.light,border:`1px solid ${C.border}`,color:C.primary,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s"}}
              hoverStyle={{background:C.primary,color:"#fff",borderColor:C.primary}}>
              {q.l}
            </Btn>
          ))}
        </div>
      )}

      {/* WhatsApp + Call strip */}
      <div style={{padding:"8px 14px",borderTop:`1px solid ${C.border}`,background:C.white,display:"flex",gap:"8px",flexShrink:0}}>
        <a href={`https://wa.me/${CLINIC.whatsapp}?text=${encodeURIComponent("Namaste! I'd like to book an appointment.")}`} target="_blank" rel="noopener noreferrer"
          style={{flex:1,padding:"9px",borderRadius:"12px",background:C.waLight,border:"1px solid #BBF7D0",color:C.green,fontSize:"12.5px",fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
          💬 WhatsApp
        </a>
        <a href={`tel:${CLINIC.phone}`}
          style={{flex:1,padding:"9px",borderRadius:"12px",background:C.callLight,border:"1px solid #BFDBFE",color:C.call,fontSize:"12.5px",fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
          📞 {CLINIC.phone}
        </a>
      </div>

      {/* Input */}
      <div style={{padding:"10px 14px 14px",borderTop:`1px solid ${C.border}`,background:C.white,display:"flex",gap:"8px",alignItems:"center",flexShrink:0}}>
        <textarea ref={iRef} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
          placeholder={active?`Message ${CLINIC.name}…`:"Chat ended — click New Chat"}
          disabled={!active||load} rows={1} aria-label="Type your message"
          style={{flex:1,background:C.offWhite,border:`1.5px solid ${C.border}`,borderRadius:"12px",padding:"10px 14px",fontSize:"13.5px",color:C.text,outline:"none",resize:"none",fontFamily:"inherit",lineHeight:"1.5",caretColor:C.primary,transition:"border-color 0.2s",boxSizing:"border-box"}}
          onFocus={e=>{e.target.style.borderColor=C.primary;e.target.style.background=C.lighter;}}
          onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.background=C.offWhite;}}
        />
        <Btn onClick={()=>send()} disabled={!ok}
          style={{width:"42px",height:"42px",borderRadius:"12px",flexShrink:0,background:ok?`linear-gradient(135deg,${C.primary},${C.primary2})`:"#E5E7EB",border:"none",cursor:ok?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:ok?`0 4px 16px rgba(10,123,108,0.4)`:"none",transition:"all 0.2s"}}
          hoverStyle={ok?{transform:"scale(1.06)"}:{}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke={ok?"#fff":"#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={ok?"#fff":"#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Btn>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [leads,setLeads]           = useState([]);
  const [showLeads,setShowLeads]   = useState(false);
  const [showPrice,setShowPrice]   = useState(false);
  const [contact,setContact]       = useState(null);
  const [go,setGo]                 = useState(false);
  const [navBg,setNavBg]           = useState(false);
  const [showServices,setShowSvc]  = useState(false);
  const demoRef = useRef(null);

  useEffect(()=>{ setTimeout(()=>setGo(true),400); },[]);
  useEffect(()=>{ const fn=()=>setNavBg(window.scrollY>60); window.addEventListener("scroll",fn); return()=>window.removeEventListener("scroll",fn); },[]);

  const scrollToDemo=()=>demoRef.current?.scrollIntoView({behavior:"smooth",block:"center"});
  const c1=useCount(1247,2200,go), c2=useCount(98,1800,go), c3=useCount(847,2000,go);

  return (
    <div style={{minHeight:"100vh",background:"#F7FFFE",fontFamily:"'Inter',system-ui,sans-serif",color:C.text,overflowX:"hidden"}}>
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:`radial-gradient(circle at 15% 15%,rgba(10,123,108,0.05) 0%,transparent 50%),radial-gradient(circle at 85% 85%,rgba(13,148,136,0.04) 0%,transparent 50%)`}}/>

      {/* ── NAV ── */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"12px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",background:navBg?"rgba(247,255,254,0.96)":"transparent",backdropFilter:navBg?"blur(20px)":"none",borderBottom:navBg?`1px solid ${C.border}`:"none",transition:"all 0.3s"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"38px",height:"38px",borderRadius:"12px",background:`linear-gradient(135deg,${C.primary},${C.primary2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",boxShadow:`0 4px 14px rgba(10,123,108,0.3)`}}>🦷</div>
          <div>
            <div style={{fontWeight:800,fontSize:"15px",color:C.text,letterSpacing:"-0.3px"}}>{CLINIC.name}</div>
            <div style={{fontSize:"11px",color:C.textLight}}>{CLINIC.doctor}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          {leads.length>0&&(
            <Btn onClick={()=>setShowLeads(true)} style={{padding:"8px 14px",borderRadius:"10px",fontSize:"12px",fontWeight:600,background:C.light,border:`1px solid ${C.border}`,color:C.primary,cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",position:"relative"}} hoverStyle={{background:C.lighter}}>
              📊 Leads
              <span style={{minWidth:"18px",height:"18px",borderRadius:"9px",background:C.red,color:"#fff",fontSize:"10px",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{leads.length}</span>
            </Btn>
          )}
          <a href={`https://wa.me/${CLINIC.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{padding:"9px 16px",borderRadius:"10px",fontSize:"12.5px",fontWeight:700,background:C.waLight,border:"1px solid #BBF7D0",color:C.green,textDecoration:"none",display:"flex",alignItems:"center",gap:"5px"}}>
            💬 WhatsApp
          </a>
          <a href={`tel:${CLINIC.phone}`} style={{padding:"9px 16px",borderRadius:"10px",fontSize:"12.5px",fontWeight:700,background:C.callLight,border:"1px solid #BFDBFE",color:C.call,textDecoration:"none",display:"flex",alignItems:"center",gap:"5px"}}>
            📞 Call
          </a>
          <Btn onClick={scrollToDemo} style={{padding:"10px 20px",borderRadius:"10px",fontSize:"13px",fontWeight:700,background:`linear-gradient(135deg,${C.primary},${C.primary2})`,border:"none",color:"#fff",cursor:"pointer",boxShadow:`0 4px 16px rgba(10,123,108,0.35)`,transition:"all 0.2s"}} hoverStyle={{transform:"translateY(-1px)",boxShadow:`0 6px 20px rgba(10,123,108,0.45)`}}>
            Book Appointment →
          </Btn>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"110px 32px 70px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"60px",alignItems:"center",position:"relative",zIndex:1}}>
        {/* Left */}
        <div>
          {/* Trust badge */}
          <div style={{display:"inline-flex",alignItems:"center",gap:"8px",padding:"7px 16px",borderRadius:"20px",background:C.light,border:`1px solid ${C.border}`,marginBottom:"22px"}}>
            <span style={{width:"7px",height:"7px",borderRadius:"50%",background:C.green,display:"inline-block",boxShadow:`0 0 8px rgba(22,163,74,0.6)`,animation:"livepulse 1.5s ease infinite"}}/>
            <span style={{fontSize:"12px",fontWeight:600,color:C.primary}}>Serving Thane West since {CLINIC.established} · {CLINIC.experience} Experience</span>
          </div>

          <h1 style={{fontSize:"clamp(32px,4vw,52px)",fontWeight:900,letterSpacing:"-2px",lineHeight:1.08,margin:"0 0 16px",color:C.text}}>
            {CLINIC.doctor}<br/>
            <span style={{background:`linear-gradient(135deg,${C.primary},${C.primary2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Dental Clinic</span><br/>
            <span style={{fontSize:"clamp(20px,2.5vw,32px)",color:C.textMid,fontWeight:600,letterSpacing:"-0.5px"}}>Vartak Nagar, Thane West</span>
          </h1>

          <p style={{fontSize:"16px",color:C.textMid,lineHeight:1.7,margin:"0 0 24px",maxWidth:"420px",fontStyle:"italic"}}>"Your Smile, Our Passion" — {CLINIC.experience} of dental excellence in Thane</p>

          {/* Info cards */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"28px"}}>
            {[
              {icon:"📍",title:"Address",val:"RAINART APT, Vartak Nagar\nThane West – 400606",link:CLINIC.maps},
              {icon:"⏰",title:"Timings",val:"Mon–Sat: 9AM–1PM, 5PM–9PM\nSunday: Emergency Only"},
              {icon:"📞",title:"Phone",val:CLINIC.phone,link:`tel:${CLINIC.phone}`},
              {icon:"💬",title:"WhatsApp",val:"Chat with us anytime",link:`https://wa.me/${CLINIC.whatsapp}`},
            ].map((card,i)=>(
              <div key={i} onClick={()=>card.link&&window.open(card.link,"_blank")} style={{padding:"14px",borderRadius:"14px",background:C.white,border:`1px solid ${C.border}`,boxShadow:"0 2px 8px rgba(0,0,0,0.04)",cursor:card.link?"pointer":"default",transition:"all 0.2s"}}
                onMouseEnter={e=>{ if(card.link){e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.boxShadow=`0 4px 16px rgba(10,123,108,0.12)`;} }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.04)"; }}>
                <div style={{fontSize:"18px",marginBottom:"6px"}}>{card.icon}</div>
                <div style={{fontSize:"11px",fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"4px"}}>{card.title}</div>
                <div style={{fontSize:"12.5px",color:C.text,fontWeight:500,lineHeight:1.5,whiteSpace:"pre-line"}}>{card.val}</div>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
            <Btn onClick={scrollToDemo} style={{padding:"14px 28px",borderRadius:"14px",fontSize:"14px",fontWeight:800,background:`linear-gradient(135deg,${C.primary},${C.primary2})`,border:"none",color:"#fff",cursor:"pointer",boxShadow:`0 6px 24px rgba(10,123,108,0.4)`,transition:"all 0.2s"}} hoverStyle={{transform:"translateY(-2px)",boxShadow:`0 10px 30px rgba(10,123,108,0.5)`}}>
              📅 Book Appointment
            </Btn>
            <a href={`https://wa.me/${CLINIC.whatsapp}?text=${encodeURIComponent("Namaste Doctor! I'd like to book an appointment.")}`} target="_blank" rel="noopener noreferrer"
              style={{padding:"14px 22px",borderRadius:"14px",fontSize:"14px",fontWeight:700,background:C.wa,color:"#fff",textDecoration:"none",boxShadow:"0 6px 20px rgba(37,211,102,0.4)",display:"flex",alignItems:"center",gap:"6px"}}>
              💬 WhatsApp Us
            </a>
            <a href={`tel:${CLINIC.phone}`} style={{padding:"14px 22px",borderRadius:"14px",fontSize:"14px",fontWeight:700,background:C.callLight,border:"1px solid #BFDBFE",color:C.call,textDecoration:"none",display:"flex",alignItems:"center",gap:"6px"}}>
              📞 {CLINIC.phone}
            </a>
          </div>
          <div style={{marginTop:"12px",fontSize:"12px",color:C.textLight}}>✅ AI Receptionist available 24/7 · Instant appointments</div>
        </div>

        {/* Right — Stats + Services */}
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
            {[
              {icon:"📅",val:c1+"+",label:"Appointments",color:C.primary},
              {icon:"😊",val:c3+"+",label:"Happy Patients",color:C.primary2},
              {icon:"⭐",val:"4.9",label:"Google Rating",color:C.gold},
            ].map((s,i)=>(
              <div key={i} style={{textAlign:"center",padding:"18px 12px",borderRadius:"16px",background:C.white,border:`1px solid ${C.border}`,boxShadow:"0 2px 10px rgba(10,123,108,0.07)"}}>
                <div style={{fontSize:"22px",marginBottom:"6px"}}>{s.icon}</div>
                <div style={{fontSize:"22px",fontWeight:900,color:s.color,letterSpacing:"-0.8px"}}>{s.val}</div>
                <div style={{fontSize:"10.5px",color:C.textLight,marginTop:"3px",fontWeight:500}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Services preview */}
          <div style={{padding:"18px",borderRadius:"18px",background:C.white,border:`1px solid ${C.border}`,boxShadow:"0 2px 10px rgba(10,123,108,0.07)"}}>
            <div style={{fontWeight:700,fontSize:"13px",color:C.text,marginBottom:"12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>🦷 Our Services ({CLINIC.services.length})</span>
              <Btn onClick={()=>setShowSvc(p=>!p)} style={{fontSize:"11px",color:C.primary,background:"none",border:"none",cursor:"pointer",fontWeight:600,padding:"0"}} hoverStyle={{color:C.dark}}>
                {showServices?"Show Less ↑":"View All ↓"}
              </Btn>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>
              {(showServices?CLINIC.services:CLINIC.services.slice(0,8)).map((s,i)=>(
                <span key={i} style={{padding:"4px 12px",borderRadius:"20px",fontSize:"11.5px",fontWeight:500,background:C.light,border:`1px solid ${C.border}`,color:C.primary}}>{s}</span>
              ))}
              {!showServices&&CLINIC.services.length>8&&(
                <span onClick={()=>setShowSvc(true)} style={{padding:"4px 12px",borderRadius:"20px",fontSize:"11.5px",fontWeight:600,background:C.primary,color:"#fff",cursor:"pointer"}}>+{CLINIC.services.length-8} more</span>
              )}
            </div>
          </div>

          {/* Google Maps link */}
          <a href={CLINIC.maps} target="_blank" rel="noopener noreferrer" style={{padding:"16px",borderRadius:"16px",background:C.lighter,border:`1px solid ${C.border}`,textDecoration:"none",display:"flex",alignItems:"center",gap:"12px",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.background=C.light;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.lighter;}}>
            <div style={{width:"44px",height:"44px",borderRadius:"12px",background:`linear-gradient(135deg,${C.primary},${C.primary2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",flexShrink:0}}>📍</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:"13px",color:C.text}}>Get Directions</div>
              <div style={{fontSize:"12px",color:C.textMid,marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{CLINIC.address}</div>
            </div>
            <div style={{color:C.primary,fontSize:"18px",flexShrink:0}}>→</div>
          </a>
        </div>
      </div>

      {/* ── AI CHAT DEMO ── */}
      <div ref={demoRef} style={{maxWidth:"1100px",margin:"0 auto",padding:"60px 32px",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:"44px"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:"8px",padding:"6px 16px",borderRadius:"20px",background:C.light,border:`1px solid ${C.border}`,marginBottom:"16px"}}>
            <span style={{width:"7px",height:"7px",borderRadius:"50%",background:C.green,animation:"livepulse 1.5s ease infinite"}}/>
            <span style={{fontSize:"11px",fontWeight:700,color:C.primary,letterSpacing:"1.5px",textTransform:"uppercase"}}>AI Receptionist — Available 24/7</span>
          </div>
          <h2 style={{fontSize:"clamp(24px,3.5vw,38px)",fontWeight:900,letterSpacing:"-1.5px",margin:"0 0 12px",color:C.text}}>
            Chat, WhatsApp or Call — <span style={{color:C.primary}}>we're always here</span>
          </h2>
          <p style={{fontSize:"15px",color:C.textMid,maxWidth:"440px",margin:"0 auto"}}>
            Book appointments, ask about treatments, get directions — our AI handles it all instantly.
          </p>
        </div>

        <div style={{maxWidth:"600px",margin:"0 auto",position:"relative"}}>
          <div style={{position:"absolute",inset:"12px",borderRadius:"26px",background:`rgba(10,123,108,0.08)`,filter:"blur(20px)",transform:"translateY(10px)",zIndex:0}}/>
          <div style={{position:"absolute",inset:0,borderRadius:"22px",background:C.white,border:`1px solid ${C.border}`,transform:"translate(5px,5px)",opacity:0.5,zIndex:0}}/>
          <div style={{position:"relative",zIndex:1,borderRadius:"22px",overflow:"hidden",border:`1px solid ${C.border}`,boxShadow:`0 24px 60px rgba(10,123,108,0.12),0 4px 16px rgba(0,0,0,0.06)`,height:"620px",display:"flex",flexDirection:"column"}}>
            <ChatWidget leads={leads} setLeads={setLeads} onContact={(lead,tab)=>setContact({lead,tab})}/>
          </div>
        </div>
      </div>

      {/* ── TRUST SECTION ── */}
      <div style={{background:C.white,borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,padding:"60px 32px",position:"relative",zIndex:1}}>
        <div style={{maxWidth:"1000px",margin:"0 auto"}}>
          <h2 style={{textAlign:"center",fontSize:"clamp(22px,3vw,34px)",fontWeight:900,letterSpacing:"-1px",margin:"0 0 36px",color:C.text}}>
            Why patients love <span style={{color:C.primary}}>Dr. Kishor Ahire</span>
          </h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"16px",marginBottom:"40px"}}>
            {[
              {icon:"🏆",title:"6+ Years Experience",desc:"Trusted dental care in Thane West since 2018"},
              {icon:"🔬",title:"Advanced Technology",desc:"Digital X-rays, laser dentistry & modern equipment"},
              {icon:"😊",title:"Painless Treatment",desc:"Patient comfort is our top priority"},
              {icon:"💰",title:"Affordable Fees",desc:"Quality dental care at reasonable prices"},
              {icon:"📱",title:"24/7 AI Support",desc:"Book appointments anytime, day or night"},
              {icon:"🌟",title:"4.9 ★ Rating",desc:"Hundreds of happy patients in Thane"},
            ].map((f,i)=>(
              <div key={i} style={{padding:"20px",borderRadius:"16px",background:C.lighter,border:`1px solid ${C.border}`,textAlign:"center",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.background=C.light;e.currentTarget.style.boxShadow=`0 4px 16px rgba(10,123,108,0.1)`;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.lighter;e.currentTarget.style.boxShadow="none";}}>
                <div style={{fontSize:"26px",marginBottom:"10px"}}>{f.icon}</div>
                <div style={{fontWeight:700,fontSize:"13.5px",color:C.text,marginBottom:"6px"}}>{f.title}</div>
                <div style={{fontSize:"12px",color:C.textMid,lineHeight:1.55}}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"16px"}}>
            {[
              {q:"Dr. Kishor ne mera root canal itna achhe se kiya ki mujhe dard hi nahi hua! Thane mein best dental clinic hai.",name:"Priya Sharma",loc:"Thane West",avatar:"👩"},
              {q:"AI receptionist se raat ko appointment book ki — subah confirm message aaya. Bahut convenient service!",name:"Rahul Patil",loc:"Vartak Nagar",avatar:"👨"},
              {q:"Implant ka kaam professionally kiya. Fair pricing aur excellent results. Highly recommended!",name:"Sunita Joshi",loc:"Thane",avatar:"👩"},
            ].map((t,i)=>(
              <div key={i} style={{padding:"22px",borderRadius:"18px",background:C.lighter,border:`1px solid ${C.border}`,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:"3px",background:`linear-gradient(90deg,${C.primary},${C.primary2})`}}/>
                <div style={{color:C.gold,fontSize:"14px",marginBottom:"10px"}}>★★★★★</div>
                <p style={{fontSize:"13.5px",color:C.textMid,lineHeight:1.7,margin:"0 0 16px",fontStyle:"italic"}}>"{t.q}"</p>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <div style={{width:"36px",height:"36px",borderRadius:"50%",background:C.light,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>{t.avatar}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:"13px",color:C.text}}>{t.name}</div>
                    <div style={{fontSize:"11px",color:C.textLight}}>{t.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOOK NOW CTA ── */}
      <div style={{maxWidth:"900px",margin:"0 auto",padding:"60px 32px",position:"relative",zIndex:1}}>
        <div style={{padding:"44px 40px",borderRadius:"24px",background:`linear-gradient(135deg,${C.primary},${C.primary2})`,textAlign:"center",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 80% 20%,rgba(255,255,255,0.1),transparent 60%)",pointerEvents:"none"}}/>
          <div style={{fontSize:"32px",marginBottom:"12px"}}>🦷</div>
          <h2 style={{fontSize:"clamp(20px,3vw,34px)",fontWeight:900,letterSpacing:"-1px",margin:"0 0 10px",color:"#fff",position:"relative"}}>
            Ready for your best smile?
          </h2>
          <p style={{fontSize:"15px",color:"rgba(255,255,255,0.8)",margin:"0 0 26px",position:"relative"}}>
            Book an appointment with Dr. Kishor Ahire today — AI receptionist available 24/7
          </p>
          <div style={{display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap",position:"relative"}}>
            <Btn onClick={scrollToDemo} style={{padding:"13px 28px",borderRadius:"14px",fontSize:"14px",fontWeight:800,background:"#fff",border:"none",color:C.primary,cursor:"pointer",boxShadow:"0 6px 20px rgba(0,0,0,0.15)",transition:"all 0.2s"}} hoverStyle={{transform:"translateY(-2px)"}}>
              📅 Book Appointment
            </Btn>
            <a href={`https://wa.me/${CLINIC.whatsapp}?text=${encodeURIComponent("Namaste Dr. Kishor! I'd like to book an appointment.")}`} target="_blank" rel="noopener noreferrer"
              style={{padding:"13px 24px",borderRadius:"14px",fontSize:"14px",fontWeight:700,background:C.wa,color:"#fff",textDecoration:"none",display:"flex",alignItems:"center",gap:"7px",boxShadow:"0 6px 20px rgba(37,211,102,0.4)"}}>
              💬 WhatsApp
            </a>
            <a href={`tel:${CLINIC.phone}`} style={{padding:"13px 24px",borderRadius:"14px",fontSize:"14px",fontWeight:700,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",textDecoration:"none",display:"flex",alignItems:"center",gap:"7px"}}>
              📞 {CLINIC.phone}
            </a>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{borderTop:`1px solid ${C.border}`,padding:"24px 32px",position:"relative",zIndex:1}}>
        <div style={{maxWidth:"1100px",margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"32px",height:"32px",borderRadius:"10px",background:`linear-gradient(135deg,${C.primary},${C.primary2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px"}}>🦷</div>
            <div>
              <div style={{fontWeight:700,fontSize:"13px",color:C.text}}>{CLINIC.name}</div>
              <div style={{fontSize:"11px",color:C.textLight}}>Vartak Nagar, Thane West · Est. {CLINIC.established}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:"16px",alignItems:"center",flexWrap:"wrap"}}>
            <a href={CLINIC.maps} target="_blank" rel="noopener noreferrer" style={{fontSize:"12px",color:C.textMid,textDecoration:"none",display:"flex",alignItems:"center",gap:"4px"}}>📍 Get Directions</a>
            <a href={`https://wa.me/${CLINIC.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{fontSize:"12px",color:C.green,fontWeight:600,textDecoration:"none"}}>💬 WhatsApp</a>
            <a href={`tel:${CLINIC.phone}`} style={{fontSize:"12px",color:C.call,fontWeight:600,textDecoration:"none"}}>📞 {CLINIC.phone}</a>
          </div>
          <div style={{fontSize:"11px",color:C.textLight}}>© 2025 {CLINIC.name} · AI by ClinicFlow · Built by <span style={{color:C.primary,fontWeight:600}}>Royal_Kishor</span></div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showLeads&&<LeadsPanel leads={leads} onClose={()=>setShowLeads(false)} onContact={(lead,tab)=>{ setContact({lead,tab}); }}/>}
      {contact&&<ContactModal lead={contact.lead} initTab={contact.tab} onClose={()=>setContact(null)}/>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes livepulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.8)} }
        @keyframes typingDot { 0%,60%,100%{transform:translateY(0);opacity:0.3} 30%{transform:translateY(-7px);opacity:1} }
        @keyframes msgIn     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        textarea::placeholder { color:#7BA89F; }
        button:focus-visible,a:focus-visible { outline:2px solid #0A7B6C; outline-offset:2px; }
        ::-webkit-scrollbar   { width:3px; }
        ::-webkit-scrollbar-thumb { background:#C8E8E4; border-radius:4px; }
        * { box-sizing:border-box; }
        @media(max-width:768px){
          nav { padding:10px 14px !important; }
        }
      `}</style>
    </div>
  );
}

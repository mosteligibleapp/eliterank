export const html: string = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>I'M FEELING LUCKY · Most Eligible × VibeApple</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@300;400;500;600;700&family=Italianno&display=swap" rel="stylesheet">
<style>
:root{--neon:#00ff6a;--gold:#ffd700;--hot:#ff2d78;--dark:#060a06;--dark2:#0a120a;--white:#f8fff8;--glass:rgba(0,255,106,0.07);--glass-border:rgba(0,255,106,0.18)}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{font-family:'Space Grotesk',sans-serif;background:var(--dark);height:100dvh;overflow:hidden;touch-action:manipulation}
.screen{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity .4s ease,transform .4s ease;z-index:10;overflow:hidden}
.screen.hidden{opacity:0;pointer-events:none;transform:scale(.96)}
#screen-welcome{background:radial-gradient(ellipse 120% 80% at 50% 60%,#0d2e12 0%,#060a06 70%);padding:0}
.welcome-bg-lines{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.welcome-bg-lines::before,.welcome-bg-lines::after{content:'';position:absolute;width:200%;height:2px;background:linear-gradient(90deg,transparent,rgba(0,255,106,.15),transparent)}
.welcome-bg-lines::before{top:30%;animation:scanline 6s linear infinite}
.welcome-bg-lines::after{top:65%;animation:scanline 9s linear infinite reverse}
@keyframes scanline{0%{transform:rotate(-8deg) translateX(-25%)}100%{transform:rotate(-8deg) translateX(25%)}}
.orb{position:absolute;border-radius:50%;pointer-events:none;filter:blur(60px)}
.orb1{width:300px;height:300px;background:rgba(0,255,106,.12);top:-80px;left:-60px;animation:orbFloat 8s ease-in-out infinite}
.orb2{width:250px;height:250px;background:rgba(255,215,0,.08);bottom:-60px;right:-40px;animation:orbFloat 10s ease-in-out infinite reverse}
@keyframes orbFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-30px)}}
.welcome-inner{position:relative;z-index:5;display:flex;flex-direction:column;align-items:center;padding:40px 28px;width:100%}
.collab-badge{display:flex;align-items:center;gap:10px;background:var(--glass);border:1px solid var(--glass-border);border-radius:100px;padding:7px 16px;margin-bottom:28px}
.collab-dot{width:6px;height:6px;border-radius:50%;background:var(--neon);box-shadow:0 0 8px var(--neon);animation:pdot 2s ease-in-out infinite}
@keyframes pdot{0%,100%{opacity:1}50%{opacity:.3}}
.collab-text{font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.7)}
.collab-x{color:var(--neon);font-weight:700}
.hero-feeling{font-size:clamp(15px,4vw,18px);font-weight:300;letter-spacing:6px;text-transform:uppercase;color:rgba(255,255,255,.5)}
.hero-im{font-family:'Italianno',cursive;font-size:clamp(52px,14vw,88px);color:var(--white);line-height:.9}
.hero-lucky{font-family:'Bebas Neue',sans-serif;font-size:clamp(76px,22vw,140px);line-height:.85;background:linear-gradient(135deg,var(--neon) 0%,#a8ff78 40%,var(--gold) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;filter:drop-shadow(0 0 30px rgba(0,255,106,.5));animation:lglow 3s ease-in-out infinite}
@keyframes lglow{0%,100%{filter:drop-shadow(0 0 20px rgba(0,255,106,.4))}50%{filter:drop-shadow(0 0 50px rgba(0,255,106,.8))}}
.hero-shamrock{font-size:clamp(32px,8vw,52px);animation:sf 4s ease-in-out infinite;display:inline-block;margin-left:8px;vertical-align:middle}
@keyframes sf{0%,100%{transform:rotate(-10deg) translateY(0)}25%{transform:rotate(10deg) translateY(-8px)}}
.hero-sub{font-size:13px;color:rgba(255,255,255,.45);letter-spacing:1px;margin-top:14px;margin-bottom:36px;text-align:center}
.hero-sub strong{color:rgba(255,255,255,.75);font-weight:500}
.btn-go{position:relative;background:transparent;border:1.5px solid var(--neon);color:var(--neon);padding:16px 52px;border-radius:4px;font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:3px;cursor:pointer;overflow:hidden;transition:color .3s,transform .15s;box-shadow:0 0 20px rgba(0,255,106,.2)}
.btn-go::before{content:'';position:absolute;inset:0;background:var(--neon);transform:scaleX(0);transform-origin:left;transition:transform .3s ease;z-index:-1}
.btn-go:hover::before,.btn-go:active::before{transform:scaleX(1)}
.btn-go:hover,.btn-go:active{color:var(--dark);transform:scale(.98)}
.event-strip{position:absolute;bottom:0;left:0;right:0;background:rgba(0,255,106,.06);border-top:1px solid rgba(0,255,106,.12);padding:12px 24px;display:flex;justify-content:space-between;align-items:center;z-index:5}
.event-strip span{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.35)}
.live-dot{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--hot)}
.live-dot-circle{width:6px;height:6px;background:var(--hot);border-radius:50%;animation:pdot 1.5s ease-in-out infinite;box-shadow:0 0 8px var(--hot)}
#screen-camera{padding:0;background:#000}
#video{width:100%;height:100%;object-fit:cover}
#demo-viewfinder{display:none;position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,#0d2e12 0%,#020803 100%);flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
.demo-orb{position:absolute;border-radius:50%;filter:blur(50px);pointer-events:none}
.demo-orb1{width:200px;height:200px;background:rgba(0,255,106,.2);top:5%;left:5%}
.demo-orb2{width:160px;height:160px;background:rgba(255,215,0,.12);top:5%;right:5%}
.demo-silhouette{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;margin-bottom:30px}
.demo-head{width:80px;height:95px;background:rgba(0,0,0,.6);border-radius:50% 50% 40% 40%;margin-bottom:-8px;box-shadow:0 0 50px rgba(0,255,106,.25)}
.demo-body{width:150px;height:180px;background:rgba(0,0,0,.5);border-radius:55% 55% 30% 30%}
.demo-glow{position:absolute;top:0;left:50%;transform:translateX(-50%);width:220px;height:220px;background:radial-gradient(circle,rgba(0,255,106,.15),transparent 70%);border-radius:50%}
.demo-emoji{position:absolute;font-size:36px;filter:drop-shadow(0 0 12px rgba(0,255,106,.6))}
#demo-filter-overlay{position:absolute;inset:0;pointer-events:none;transition:background .3s}
.demo-label{position:absolute;bottom:110px;background:rgba(0,0,0,.6);border:1px solid rgba(0,255,106,.2);border-radius:100px;padding:7px 18px;font-size:10px;color:rgba(255,255,255,.45);letter-spacing:2px;text-transform:uppercase}
.cam-frame-tl,.cam-frame-tr,.cam-frame-bl,.cam-frame-br{position:absolute;width:40px;height:40px;z-index:20;pointer-events:none}
.cam-frame-tl{top:16px;left:16px;border-top:2px solid var(--neon);border-left:2px solid var(--neon)}
.cam-frame-tr{top:16px;right:16px;border-top:2px solid var(--neon);border-right:2px solid var(--neon)}
.cam-frame-bl{bottom:16px;left:16px;border-bottom:2px solid var(--neon);border-left:2px solid var(--neon)}
.cam-frame-br{bottom:16px;right:16px;border-bottom:2px solid var(--neon);border-right:2px solid var(--neon)}
.cam-scan{position:absolute;left:16px;right:16px;height:2px;background:linear-gradient(90deg,transparent,var(--neon),transparent);opacity:.5;z-index:20;pointer-events:none;animation:scanDown 3s linear infinite;box-shadow:0 0 10px var(--neon)}
@keyframes scanDown{0%{top:16px;opacity:.6}50%{opacity:.3}100%{top:calc(100% - 16px);opacity:.6}}
.cam-hud-top{position:absolute;top:0;left:0;right:0;z-index:25;background:linear-gradient(180deg,rgba(0,0,0,.7) 0%,transparent 100%);padding:16px 20px 36px;display:flex;align-items:center;justify-content:space-between;pointer-events:all}
.cam-brand{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:var(--neon);text-shadow:0 0 15px rgba(0,255,106,.6)}
.cam-filters{display:flex;gap:8px}
.cam-filter-btn{width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(255,255,255,.25);background:rgba(0,0,0,.4);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color .2s,transform .15s}
.cam-filter-btn.active{border-color:var(--neon);box-shadow:0 0 12px rgba(0,255,106,.5);transform:scale(1.12)}
.cam-hud-bottom{position:absolute;bottom:0;left:0;right:0;z-index:25;background:linear-gradient(0deg,rgba(0,0,0,.8) 0%,transparent 100%);padding:36px 24px 28px;display:flex;flex-direction:column;align-items:center;gap:12px;pointer-events:all}
.shutter-wrap{width:78px;height:78px;border-radius:50%;border:2px solid var(--neon);box-shadow:0 0 20px rgba(0,255,106,.35);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s;animation:sp 3s ease-in-out infinite}
@keyframes sp{0%,100%{box-shadow:0 0 20px rgba(0,255,106,.35)}50%{box-shadow:0 0 35px rgba(0,255,106,.6)}}
.shutter-wrap:active{transform:scale(.92)}
.shutter-inner{width:62px;height:62px;border-radius:50%;background:radial-gradient(circle,rgba(0,255,106,.9),rgba(0,200,70,.7));box-shadow:0 0 20px rgba(0,255,106,.6)}
.cam-hint{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.35);font-weight:500}
#countdown-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);z-index:50;pointer-events:none}
#countdown-overlay.hidden{display:none}
#countdown-num{font-family:'Bebas Neue',sans-serif;font-size:180px;color:var(--neon);text-shadow:0 0 80px rgba(0,255,106,.8);animation:cb .7s cubic-bezier(.25,.46,.45,.94)}
@keyframes cb{0%{transform:scale(2);opacity:0}100%{transform:scale(1);opacity:1}}
#flash{position:fixed;inset:0;background:white;z-index:100;pointer-events:none;opacity:0;transition:opacity .06s}
#flash.on{opacity:1}
#video.f-none{filter:none}#video.f-green{filter:hue-rotate(80deg) saturate(1.6) brightness(1.05)}#video.f-gold{filter:sepia(.6) saturate(1.5) brightness(1.1)}#video.f-hot{filter:hue-rotate(300deg) saturate(1.8) contrast(1.1)}
#screen-preview{background:var(--dark2);overflow-y:auto;justify-content:flex-start;padding:28px 20px 40px}
#preview-canvas{width:100%;max-width:380px;height:auto;border-radius:16px;box-shadow:0 0 0 1px var(--glass-border),0 0 40px rgba(0,255,106,.15),0 20px 60px rgba(0,0,0,.7);margin-bottom:20px}
.preview-header{width:100%;max-width:380px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.preview-header-title{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:2px;color:var(--white)}
.preview-header-title span{color:var(--neon)}
.preview-actions{width:100%;max-width:380px;display:flex;gap:10px;margin-bottom:20px}
.btn-retake{flex:1;background:transparent;border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.6);padding:13px;border-radius:8px;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;cursor:pointer}
.btn-save{flex:2;background:linear-gradient(135deg,#1a3d1a,#0d2e12);border:1px solid var(--neon);color:var(--neon);padding:13px;border-radius:8px;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700;cursor:pointer}
.nom-card{width:100%;max-width:380px;border:1px solid var(--glass-border);background:rgba(0,255,106,.03);border-radius:16px;padding:22px;margin-bottom:16px}
.nom-card-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;color:var(--neon);margin-bottom:18px;display:flex;align-items:center;gap:8px}
.nom-card-title::before{content:'';display:block;width:3px;height:20px;background:var(--neon);border-radius:2px;box-shadow:0 0 8px var(--neon)}
.field{margin-bottom:13px}
.field label{display:block;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:6px}
.field input,.field select{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:12px 14px;font-family:'Space Grotesk',sans-serif;font-size:14px;color:var(--white);outline:none;-webkit-appearance:none}
.field input:focus,.field select:focus{border-color:var(--neon);box-shadow:0 0 12px rgba(0,255,106,.15)}
.field input::placeholder{color:rgba(255,255,255,.2)}
.field select option{background:#0a120a}
.toggle-row{display:flex;align-items:center;gap:10px;margin-bottom:16px;cursor:pointer}
.tpill{width:42px;height:23px;background:rgba(255,255,255,.12);border-radius:100px;position:relative;transition:background .2s}
.tpill.on{background:var(--neon)}
.tpill::after{content:'';position:absolute;top:3px;left:3px;width:17px;height:17px;background:white;border-radius:50%;transition:transform .2s}
.tpill.on::after{transform:translateX(19px)}
.tlabel{font-size:13px;color:rgba(255,255,255,.6)}
.btn-nominate{width:100%;background:linear-gradient(135deg,var(--neon),#a8ff78);color:var(--dark);border:none;padding:15px;border-radius:10px;font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;cursor:pointer;box-shadow:0 0 25px rgba(0,255,106,.35)}
.btn-skip-nom{font-size:12px;color:rgba(255,255,255,.25);background:none;border:none;cursor:pointer;letter-spacing:1px;padding:10px;text-decoration:underline;text-underline-offset:3px}
#screen-success{background:radial-gradient(ellipse 100% 80% at 50% 30%,#0d2e12 0%,#060a06 70%);text-align:center;padding:40px 28px}
.success-crown{font-size:70px;animation:crownB .7s cubic-bezier(.36,.07,.19,.97) .2s both;filter:drop-shadow(0 0 30px rgba(255,215,0,.7))}
@keyframes crownB{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0);opacity:1}}
.success-tag{display:inline-block;background:rgba(0,255,106,.08);border:1px solid rgba(0,255,106,.2);color:var(--neon);font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin:16px 0 10px}
.success-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(42px,12vw,68px);line-height:.95;color:var(--white);margin-bottom:8px}
.success-title .hl{color:var(--neon);text-shadow:0 0 30px rgba(0,255,106,.5)}
.success-sub{font-size:13px;color:rgba(255,255,255,.5);line-height:1.6;max-width:280px;margin:0 auto 28px}
.success-sub strong{color:rgba(255,255,255,.8)}
.qr-card{background:white;border-radius:18px;padding:18px;display:inline-flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:24px}
.qr-title{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#1a1a1a}
.qr-url{font-size:13px;font-weight:700;color:#0a2a0a}
.btn-again{background:transparent;border:1.5px solid rgba(0,255,106,.35);color:rgba(255,255,255,.6);padding:13px 36px;border-radius:8px;font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:.5px}
.ticker-bar{position:fixed;bottom:0;left:0;right:0;background:linear-gradient(90deg,var(--dark),#0d2e12,var(--dark));border-top:1px solid rgba(0,255,106,.2);padding:8px 0;z-index:200;overflow:hidden;display:none;white-space:nowrap}
.ticker-inner{display:inline-block;animation:tickerScroll 22s linear infinite;font-size:11px;font-weight:600;letter-spacing:1.5px;color:rgba(255,255,255,.5);text-transform:uppercase}
.ticker-inner .t-green{color:var(--neon)}
@keyframes tickerScroll{0%{transform:translateX(100vw)}100%{transform:translateX(-100%)}}
#hidden-canvas{display:none}
</style></head><body>
<div id="flash"></div><canvas id="hidden-canvas"></canvas>
<div class="screen" id="screen-welcome"><div class="welcome-bg-lines"></div><div class="orb orb1"></div><div class="orb orb2"></div><div class="welcome-inner"><div class="collab-badge"><div class="collab-dot"></div><div class="collab-text">Most Eligible <span class="collab-x">×</span> VibeApple</div></div><div class="hero-feeling">I'm Feeling</div><div style="line-height:1;margin-bottom:6px"><span class="hero-lucky">LUCKY</span><span class="hero-shamrock">🍀</span></div><p class="hero-sub"><strong>St. Patrick's Day · Lucky Disco Chicago</strong><br>Snap your photo · Get nominated · Win the crown</p><button class="btn-go" onclick="startCamera()">LET'S GO &nbsp;☘️</button></div><div class="event-strip"><span>March 2026 · Chicago, IL</span><div class="live-dot"><div class="live-dot-circle"></div>Nominations Open</div></div></div>
<div class="screen hidden" id="screen-camera"><video id="video" autoplay playsinline muted class="f-none"></video><div id="demo-viewfinder"><div class="demo-orb demo-orb1"></div><div class="demo-orb demo-orb2"></div><div class="demo-silhouette"><div class="demo-glow"></div><div class="demo-head"></div><div class="demo-body"></div></div><div class="demo-emoji" style="top:12%;left:8%">🍀</div><div class="demo-emoji" style="top:10%;right:10%">👑</div><div class="demo-emoji" style="bottom:30%;left:6%">✨</div><div class="demo-emoji" style="bottom:28%;right:8%">🌟</div><div id="demo-filter-overlay"></div><div class="demo-label">📷 Demo Mode — tap shutter to preview</div></div><div class="cam-frame-tl"></div><div class="cam-frame-tr"></div><div class="cam-frame-bl"></div><div class="cam-frame-br"></div><div class="cam-scan"></div><div class="cam-hud-top"><div class="cam-brand">MOST ELIGIBLE</div><div class="cam-filters"><button class="cam-filter-btn active" onclick="setFilter('none',this)">📷</button><button class="cam-filter-btn" onclick="setFilter('green',this)">🟢</button><button class="cam-filter-btn" onclick="setFilter('gold',this)">✨</button><button class="cam-filter-btn" onclick="setFilter('hot',this)">🔥</button></div></div><div class="cam-hud-bottom"><div class="shutter-wrap" onclick="startCountdown()"><div class="shutter-inner"></div></div><div class="cam-hint">Tap to shoot · 3 second timer</div></div><div id="countdown-overlay" class="hidden"><div id="countdown-num">3</div></div></div>
<div class="screen hidden" id="screen-preview"><div class="preview-header"><div class="preview-header-title">YOUR <span>SHOT</span></div><div style="font-size:11px;color:rgba(255,255,255,.3);letter-spacing:1.5px;text-transform:uppercase">Most Eligible 2026</div></div><canvas id="preview-canvas"></canvas><div class="preview-actions"><button class="btn-retake" onclick="retake()">↩ Retake</button><button class="btn-save" onclick="savePhoto()">⬇ Save</button></div><div class="nom-card"><div class="nom-card-title">Enter the Competition</div><div class="toggle-row" onclick="toggleSelfNom()"><div class="tpill" id="tpill"></div><div class="tlabel" id="tlabel">Nominating myself</div></div><div class="field"><label id="name-label">Your Name</label><input id="nom-name" type="text" placeholder="First & Last" autocomplete="off"></div><div class="field" id="nominee-field" style="display:none"><label>Nominee's Name</label><input id="nom-nominee" type="text" placeholder="Who are you nominating?" autocomplete="off"></div><div class="field"><label>Instagram Handle</label><input id="nom-ig" type="text" placeholder="@handle" autocomplete="off"></div><div class="field"><label>Email</label><input id="nom-email" type="email" placeholder="you@email.com" autocomplete="off"></div><div class="field"><label>Competition</label><select id="nom-comp"><option value="bachelorette">Most Eligible Bachelorette 2026 🌹</option><option value="bachelor">Most Eligible Bachelor — Summer 2026 🤵</option><option value="both">Both Competitions</option></select></div><button class="btn-nominate" onclick="submitNomination()">SUBMIT NOMINATION ✦</button></div><button class="btn-skip-nom" onclick="skipToSuccess()">Skip — just save my photo</button></div>
<div class="screen hidden" id="screen-success"><div class="success-crown">👑</div><div class="success-tag">Nomination Received</div><h1 class="success-title">YOU'RE IN<br>THE <span class="hl">RUNNING</span></h1><p class="success-sub">We've got you. 🍀<br>Competition runs through <strong>May 31st</strong> — follow along at eliterank.co</p><div class="qr-card"><div class="qr-title">Follow the Competition</div><canvas id="qr-canvas" width="150" height="150"></canvas><div class="qr-url">eliterank.co</div></div><button class="btn-again" onclick="resetAll()">☘️ &nbsp;Take Another Photo</button></div>
<div class="ticker-bar" id="ticker-bar"><span class="ticker-inner" id="ticker-text"></span></div>
<script>
let stream=null,photoDataURL=null,demoMode=false,selfNomMode=true,currentFilter='none',countdownTimer=null,nominations=[];
try{nominations=JSON.parse(localStorage.getItem('me_noms')||'[]');}catch(e){}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));document.getElementById(id).classList.remove('hidden');}
async function startCamera(){showScreen('screen-camera');if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){activateDemoMode();return;}try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:960}},audio:false});document.getElementById('video').srcObject=stream;document.getElementById('video').style.display='block';document.getElementById('demo-viewfinder').style.display='none';}catch(e){activateDemoMode();}}
function activateDemoMode(){demoMode=true;document.getElementById('video').style.display='none';document.getElementById('demo-viewfinder').style.display='flex';}
function setFilter(n,b){currentFilter=n;document.getElementById('video').className='f-'+n;document.querySelectorAll('.cam-filter-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');const fo=document.getElementById('demo-filter-overlay');if(fo){if(n==='green')fo.style.background='rgba(0,120,50,.2)';else if(n==='gold')fo.style.background='rgba(180,130,0,.22)';else if(n==='hot')fo.style.background='rgba(180,0,80,.2)';else fo.style.background='transparent';}}
function startCountdown(){const ov=document.getElementById('countdown-overlay'),nm=document.getElementById('countdown-num');ov.classList.remove('hidden');let c=3;nm.textContent=c;nm.style.animation='none';void nm.offsetWidth;nm.style.animation='cb .7s cubic-bezier(.25,.46,.45,.94)';countdownTimer=setInterval(()=>{c--;if(c<=0){clearInterval(countdownTimer);ov.classList.add('hidden');capturePhoto();}else{nm.textContent=c;nm.style.animation='none';void nm.offsetWidth;nm.style.animation='cb .7s cubic-bezier(.25,.46,.45,.94)';}},1000);}
function capturePhoto(){const fl=document.getElementById('flash');fl.classList.add('on');setTimeout(()=>fl.classList.remove('on'),140);const hc=document.getElementById('hidden-canvas'),ctx=hc.getContext('2d'),W=640,H=480;hc.width=W;hc.height=H;if(demoMode){drawDemo(ctx,W,H);}else{const v=document.getElementById('video');ctx.save();ctx.translate(W,0);ctx.scale(-1,1);ctx.drawImage(v,0,0,W,H);ctx.restore();applyF(ctx,W,H);}drawWM(ctx,W,H);photoDataURL=hc.toDataURL('image/jpeg',.92);const pc=document.getElementById('preview-canvas'),p=pc.getContext('2d');pc.width=W;pc.height=H;p.drawImage(hc,0,0);stopStream();showScreen('screen-preview');}
function drawDemo(ctx,W,H){const bg=ctx.createRadialGradient(W*.5,H*.35,0,W*.5,H*.5,W*.9);if(currentFilter==='hot'){bg.addColorStop(0,'#3a0020');bg.addColorStop(.6,'#1a000d');bg.addColorStop(1,'#040004');}else if(currentFilter==='gold'){bg.addColorStop(0,'#2e1e00');bg.addColorStop(.6,'#150e00');bg.addColorStop(1,'#050300');}else{bg.addColorStop(0,'#0a2e16');bg.addColorStop(.6,'#041409');bg.addColorStop(1,'#010401');}ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.strokeStyle=currentFilter==='hot'?'rgba(255,45,120,.08)':'rgba(0,255,106,.08)';ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}const nc=currentFilter==='hot'?'rgba(255,45,120,':'rgba(0,255,106,';[[.15,.15,80],[.85,.12,60],[.08,.78,70],[.88,.8,90]].forEach(([rx,ry,r])=>{const g=ctx.createRadialGradient(rx*W,ry*H,0,rx*W,ry*H,r);g.addColorStop(0,nc+'.2)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);});ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.ellipse(W*.5,H*.83,W*.19,H*.28,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(W*.5,H*.38,W*.12,H*.15,0,0,Math.PI*2);ctx.fill();const hl=ctx.createRadialGradient(W*.5,H*.38,0,W*.5,H*.38,W*.25);hl.addColorStop(0,nc+'.28)');hl.addColorStop(1,'transparent');ctx.fillStyle=hl;ctx.fillRect(0,0,W,H);ctx.globalAlpha=.4;ctx.font='34px serif';[['🍀',.06,.12],['👑',.84,.1],['✨',.84,.82],['🌟',.06,.8]].forEach(([e,ex,ey])=>ctx.fillText(e,ex*W,ey*H+34));ctx.globalAlpha=1;applyF(ctx,W,H);}
function applyF(ctx,W,H){if(currentFilter==='green'){ctx.fillStyle='rgba(0,100,40,.18)';ctx.fillRect(0,0,W,H);}else if(currentFilter==='gold'){ctx.fillStyle='rgba(160,120,0,.2)';ctx.fillRect(0,0,W,H);}else if(currentFilter==='hot'){ctx.fillStyle='rgba(180,0,80,.2)';ctx.fillRect(0,0,W,H);}}
function drawWM(ctx,W,H){const bH=H*.12;ctx.fillStyle='rgba(6,10,6,.88)';ctx.fillRect(0,H-bH,W,bH);ctx.fillStyle='#00ff6a';ctx.fillRect(0,H-bH,W,1.5);const fS=Math.max(17,W*.036);ctx.font='900 '+fS+'px Arial Black,sans-serif';ctx.fillStyle='#00ff6a';ctx.textAlign='left';ctx.fillText('MOST ELIGIBLE',W*.04,H-bH+bH*.46);ctx.font=(fS*.6)+'px sans-serif';ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillText('eliterank.co · Chicago 2026',W*.04,H-bH+bH*.78);ctx.font=(bH*.65)+'px serif';ctx.textAlign='right';ctx.fillText('🍀',W*.97,H-bH*.15);const ac=currentFilter==='hot'?'rgba(255,45,120,.55)':'rgba(0,255,106,.4)';ctx.strokeStyle=ac;ctx.lineWidth=Math.max(1.5,W*.0025);const pad=W*.025,cL=W*.055;ctx.beginPath();ctx.moveTo(pad+cL,pad);ctx.lineTo(pad,pad);ctx.lineTo(pad,pad+cL);ctx.stroke();ctx.beginPath();ctx.moveTo(W-pad-cL,pad);ctx.lineTo(W-pad,pad);ctx.lineTo(W-pad,pad+cL);ctx.stroke();}
function stopStream(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}}
function retake(){showScreen('screen-welcome');}
function savePhoto(){if(!photoDataURL)return;const a=document.createElement('a');a.href=photoDataURL;a.download='most-eligible-lucky-2026.jpg';a.click();}
function toggleSelfNom(){selfNomMode=!selfNomMode;const p=document.getElementById('tpill'),l=document.getElementById('tlabel'),nf=document.getElementById('nominee-field');if(selfNomMode){p.classList.remove('on');l.textContent='Nominating myself';nf.style.display='none';}else{p.classList.add('on');l.textContent='Nominating a friend';nf.style.display='block';}}
function submitNomination(){const name=document.getElementById('nom-name').value.trim(),email=document.getElementById('nom-email').value.trim();if(!name||!email){if(!name)document.getElementById('nom-name').style.borderColor='#ff2d78';if(!email)document.getElementById('nom-email').style.borderColor='#ff2d78';return;}nominations.push({id:Date.now(),nominee:selfNomMode?name:(document.getElementById('nom-nominee').value.trim()||name),ig:document.getElementById('nom-ig').value.trim(),email,comp:document.getElementById('nom-comp').value,ts:new Date().toISOString()});try{localStorage.setItem('me_noms',JSON.stringify(nominations));}catch(e){}skipToSuccess();}
function skipToSuccess(){drawQR();showScreen('screen-success');if(nominations.length>0)showTicker();}
function drawQR(){const cv=document.getElementById('qr-canvas'),ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,150,150);const df=(x,y)=>{ctx.fillStyle='#060a06';ctx.fillRect(x,y,34,34);ctx.fillStyle='#fff';ctx.fillRect(x+4,y+4,26,26);ctx.fillStyle='#060a06';ctx.fillRect(x+8,y+8,18,18);};df(6,6);df(110,6);df(6,110);df(110,110);let r=0x12345678;const lcg=n=>(Math.imul(1664525,n)+1013904223)&0xffffffff;ctx.fillStyle='#060a06';for(let i=0;i<10;i++)for(let j=0;j<10;j++){r=lcg(r);if(r%3===0){const px=46+j*9,py=46+i*9;if(px<140&&py<140)ctx.fillRect(px,py,7,7);}}ctx.fillStyle='#00ff6a';ctx.beginPath();ctx.arc(75,75,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#060a06';ctx.font='12px serif';ctx.textAlign='center';ctx.fillText('🍀',75,79);}
function updateTicker(){const txt=nominations.slice(-5).map(n=>'<span class="t-green">🍀 '+n.nominee+'</span> just entered Most Eligible Chicago').join(' · ');document.getElementById('ticker-text').innerHTML=txt+' · ';}
function showTicker(){updateTicker();document.getElementById('ticker-bar').style.display='block';}
function resetAll(){['nom-name','nom-ig','nom-email','nom-nominee'].forEach(id=>{document.getElementById(id).value='';document.getElementById(id).style.borderColor='';});selfNomMode=true;demoMode=false;document.getElementById('tpill').classList.remove('on');document.getElementById('tlabel').textContent='Nominating myself';document.getElementById('nominee-field').style.display='none';photoDataURL=null;showScreen('screen-welcome');}
if(nominations.length>0)showTicker();
</script></body></html>`;

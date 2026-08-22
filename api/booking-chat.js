<!-- ============================================= -->
<!-- WIDGET DE AGENDAMENTO COM IA — LOYAL BARBEARIA -->
<!-- Cole este bloco inteiro antes do </body> do index.html -->
<!-- ============================================= -->
<style>
  #bkFab{
    position:fixed; bottom:20px; right:20px; z-index:9999;
    width:60px; height:60px; border-radius:50%;
    background:#E3A72B; border:none; cursor:pointer;
    box-shadow:0 6px 20px rgba(0,0,0,0.35);
    font-size:26px; display:flex; align-items:center; justify-content:center;
  }
  #bkPanel{
    position:fixed; bottom:90px; right:20px; z-index:9999;
    width:340px; max-width:92vw; height:480px; max-height:75vh;
    background:#141414; border-radius:16px; overflow:hidden;
    display:none; flex-direction:column;
    box-shadow:0 10px 40px rgba(0,0,0,0.5);
    font-family:'Poppins', Arial, sans-serif;
  }
  #bkPanel.open{display:flex;}
  #bkHeader{
    background:#0c0c0c; color:#fff; padding:14px 16px;
    display:flex; justify-content:space-between; align-items:center;
  }
  #bkHeader strong{font-size:14px;}
  #bkHeader span{font-size:11px; color:#999; display:block;}
  #bkClose{background:none; border:none; color:#999; font-size:20px; cursor:pointer;}
  #bkMessages{
    flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px;
  }
  .bkMsg{max-width:80%; padding:9px 12px; border-radius:12px; font-size:13px; line-height:1.4;}
  .bkMsg.bot{background:#232323; color:#eee; align-self:flex-start; border-bottom-left-radius:2px;}
  .bkMsg.user{background:#E3A72B; color:#141414; align-self:flex-end; border-bottom-right-radius:2px; font-weight:500;}
  #bkInputRow{display:flex; gap:8px; padding:12px; border-top:1px solid #262626;}
  #bkInput{
    flex:1; background:#1e1e1e; border:1px solid #333; border-radius:10px;
    color:#fff; padding:9px 12px; font-size:13px; font-family:inherit;
  }
  #bkSend{background:#E3A72B; border:none; border-radius:10px; padding:0 14px; cursor:pointer; font-weight:600; font-size:13px;}
</style>

<button id="bkFab" onclick="bkToggle()">💬</button>
<div id="bkPanel">
  <div id="bkHeader">
    <div><strong>Agendar na Loyal</strong><span>Responde na hora, todo dia</span></div>
    <button id="bkClose" onclick="bkToggle()">×</button>
  </div>
  <div id="bkMessages"></div>
  <div id="bkInputRow">
    <input id="bkInput" placeholder="Digite aqui..." onkeydown="if(event.key==='Enter') bkSend()">
    <button id="bkSend" onclick="bkSend()">Enviar</button>
  </div>
</div>

<script>
let bkHistory = [];
let bkOpened = false;

function bkToggle(){
  const panel = document.getElementById('bkPanel');
  panel.classList.toggle('open');
  if(panel.classList.contains('open') && !bkOpened){
    bkOpened = true;
    bkAddMessage('bot', 'Oi! 👋 Sou a assistente virtual da Loyal Barbearia. Posso te ajudar a marcar um horário agora mesmo. Qual serviço você quer fazer — corte, barba, ou os dois?');
  }
}

function bkAddMessage(role, text){
  const box = document.getElementById('bkMessages');
  const div = document.createElement('div');
  div.className = 'bkMsg ' + role;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  bkHistory.push({ role: role === 'user' ? 'user' : 'assistant', content: text });
}

async function bkSend(){
  const input = document.getElementById('bkInput');
  const text = input.value.trim();
  if(!text) return;
  bkAddMessage('user', text);
  input.value = '';

  const thinking = document.createElement('div');
  thinking.className = 'bkMsg bot';
  thinking.id = 'bkThinking';
  thinking.textContent = 'digitando...';
  document.getElementById('bkMessages').appendChild(thinking);
  document.getElementById('bkMessages').scrollTop = 999999;

  try{
    const response = await fetch('/api/booking-chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ history: bkHistory })
    });
    const data = await response.json();
    document.getElementById('bkThinking').remove();
    bkAddMessage('bot', data.reply || 'Desculpa, não entendi. Pode repetir?');
  }catch(e){
    document.getElementById('bkThinking').remove();
    bkAddMessage('bot', 'Tive um probleminha aqui — tenta de novo em instantes, ou chama no WhatsApp: (61) 3541-2270.');
  }
}
</script>

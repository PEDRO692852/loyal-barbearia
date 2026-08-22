export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { history } = req.body || {};
    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: 'Histórico não enviado' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    const servicesRes = await fetch(SUPABASE_URL + '/rest/v1/services?select=*', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    });
    const services = await servicesRes.json();
    const servicesTxt = (services || []).map(s => s.name + ' - R$' + s.price + ' (' + s.duration_minutes + ' min)').join('\n');

    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const bookingsRes = await fetch(SUPABASE_URL + '/rest/v1/bookings?select=booking_date,booking_time&booking_date=gte.' + today + '&booking_date=lte.' + in30, {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    });
    const bookings = await bookingsRes.json();
    const bookingsTxt = (bookings && bookings.length) ? bookings.map(b => b.booking_date + ' às ' + b.booking_time).join(', ') : 'nenhum agendamento no momento';

    const hojeExtenso = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = 'Você é a assistente virtual de agendamento da Loyal Barbearia (Lago Sul, Brasília). Hoje é ' + hojeExtenso + '. Horário de funcionamento: Segunda a Sexta 9h-20h, Sábado 9h-18h, fechado aos domingos.\n\n' +
      'Serviços disponíveis:\n' + servicesTxt + '\n\n' +
      'Horários já ocupados nos próximos 30 dias (NÃO pode marcar em cima destes): ' + bookingsTxt + '.\n\n' +
      'Sua missão: conversar de forma natural, simpática e curta, descobrir qual serviço a pessoa quer, em que data e horário, e pegar o nome completo e telefone dela. Confirme um agendamento só se o horário estiver dentro do funcionamento e livre. Se pedir um horário ocupado ou fora do funcionamento, sugira o mais próximo disponível. Nunca invente serviço que não está na lista.\n\n' +
      'Responda SEMPRE em JSON puro, sem markdown, neste formato: {"reply": "sua resposta pro cliente", "booking": null}\n\n' +
      'Quando tiver TODAS as informações confirmadas (serviço, data, horário, nome, telefone) e o horário estiver livre, preencha booking assim: {"reply": "confirmação amigável", "booking": {"service_name": "nome exato da lista de serviços", "client_name": "nome", "client_phone": "telefone", "booking_date": "AAAA-MM-DD", "booking_time": "HH:MM"}}';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: systemPrompt,
        messages: history.map(h => ({ role: h.role, content: h.content }))
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: (data.error && data.error.message) || 'Erro na API da Anthropic' });
    }

    const text = (data.content || []).map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      parsed = { reply: text, booking: null };
    }

    if (parsed.booking && parsed.booking.service_name) {
      const svc = (services || []).find(s => s.name.toLowerCase() === parsed.booking.service_name.toLowerCase());
      if (svc) {
        await fetch(SUPABASE_URL + '/rest/v1/bookings', {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({
            service_id: svc.id,
            client_name: parsed.booking.client_name,
            client_phone: parsed.booking.client_phone,
            booking_date: parsed.booking.booking_date,
            booking_time: parsed.booking.booking_time
          })
        });
      }
    }

    return res.status(200).json({ reply: parsed.reply || 'Desculpa, pode repetir?' });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno no agendamento' });
  }
}

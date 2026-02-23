export async function onRequestPost(context) {
  const env = context.env;

  if (!env.COHERE_API_KEY) {
    return new Response(
      JSON.stringify({ error: { message: 'COHERE_API_KEY no configurada' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch(e) {
    return new Response(
      JSON.stringify({ error: { message: 'Request invalido' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const systemPrompt = body.system || '';
  const userMessage = body.messages[0].content;

  let cohereResponse;
  try {
    cohereResponse = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.COHERE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'command-r-plus-08-2024',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 2048
      })
    });
  } catch(e) {
    return new Response(
      JSON.stringify({ error: { message: 'Error conectando con Cohere: ' + e.message } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rawText = await cohereResponse.text();

  let data;
  try {
    data = JSON.parse(rawText);
  } catch(e) {
    return new Response(
      JSON.stringify({ error: { message: 'Respuesta invalida de Cohere: ' + rawText.substring(0, 200) } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Error de Cohere
  if (data.message && typeof data.message === 'string' && !data.message.content) {
    return new Response(
      JSON.stringify({ error: { message: data.message } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Extraer texto de la respuesta
  let resultText = '';
  if (data.message && data.message.content) {
    const content = data.message.content;
    if (Array.isArray(content)) {
      resultText = content.map(c => c.text || '').join('');
    } else if (typeof content === 'string') {
      resultText = content;
    }
  } else if (data.text) {
    resultText = data.text;
  } else {
    return new Response(
      JSON.stringify({ error: { message: 'Formato inesperado: ' + JSON.stringify(data).substring(0, 200) } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ content: [{ type: 'text', text: resultText }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

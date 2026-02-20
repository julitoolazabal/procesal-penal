exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method Not Allowed' } }) };
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'API key de Gemini no configurada' } })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const systemPrompt = body.system || '';
    const userMessage = body.messages[0].content;
    const fullPrompt = systemPrompt + '\n\n' + userMessage;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        })
      }
    );

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { message: 'Respuesta invalida: ' + text.substring(0, 200) } })
      };
    }

    if (data.error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { message: data.error.message } })
      };
    }

    const geminiText = data.candidates[0].content.parts[0].text;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'text', text: geminiText }] })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: err.message } })
    };
  }
};

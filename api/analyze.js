export default async function handler(req, res) {
  // Apenas aceita método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { image, timeframe } = req.body;

    if (!image || !timeframe) {
      return res.status(400).json({ error: 'Missing image or timeframe' });
    }

    // Limpa o prefixo do base64 gerado pelo frontend, se houver
    const base64Data = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    // A Chave da API que ficará escondida na Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    // O System Prompt completo e calibrado
    const systemPrompt = `You are a Senior Quantitative Analyst specializing in Crypto Futures. The user is analyzing a chart on the ${timeframe} timeframe.

CRITICAL RULE: First, verify if the image contains a financial chart with price candles/bars. If it does NOT, abort the analysis and return EXACTLY: "ERROR: No valid chart detected in the image."

If valid, analyze using Smart Money Concepts (SMC), Price Action, and Order Flow. Identify Liquidity Pools, Order Blocks (OB), Fair Value Gaps (FVG), Break of Structure (BOS), and Change of Character (ChoCh).

Return your analysis STRICTLY in the format below, keeping the emojis:

📡 **Market Context:** [1 sentence on the macro trend and current price action. E.g., Price tapping into a 15m bearish Order Block after a sweep of Asian session liquidity.]
🎯 **Technical Triggers:** [List 2-3 specific triggers.]
⚖️ **Algorithmic Verdict:** [LONG, SHORT, or NEUTRAL]
🔥 **Confluence Score:** [Give a percentage from 50% to 95%]
⚠️ **Risk Factor:** [1 short sentence on invalidation or risk.]`;

    // Montando a requisição nativa para a API REST do Gemini (Gemini 1.5 Flash é ideal para velocidade/custo)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [
          { text: systemPrompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Data
            }
          }
        ]
      }]
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Extraindo o texto da resposta do Gemini
    const analysisText = data.candidates[0].content.parts[0].text;

    return res.status(200).json({ analysis: analysisText });

  } catch (error) {
    console.error("Erro na API:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

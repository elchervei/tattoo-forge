export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "На сервере не задан OPENAI_API_KEY." });
  }

  try {
    const { idea, style = "Blackwork", detail = "Средняя", body = "Предплечье", composition = "Вертикальная" } = req.body || {};
    if (typeof idea !== "string" || !idea.trim()) {
      return res.status(400).json({ error: "Добавь описание эскиза." });
    }
    if (idea.length > 900) {
      return res.status(400).json({ error: "Описание слишком длинное (максимум 900 символов)." });
    }

    const prompt = [
      "Create a professional original tattoo flash design, isolated on a clean warm-white paper background.",
      "Main concept from the user: " + idea.trim(),
      "Tattoo style: " + style + ". Detail level: " + detail + ". Intended placement: " + body + ". Composition: " + composition + ".",
      "Make the design readable as a tattoo stencil: high contrast, clear silhouette, intentional line weight, clean edges, centered composition.",
      "No skin, no body mockup, no hands, no watermark, no lettering, no captions, no border, no extra objects unrelated to the concept.",
      "Return only the artwork on a plain off-white background, suitable for reviewing and preparing a tattoo stencil."
    ].join("\n");

    const upstream = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        quality: "medium",
        n: 1
      })
    });

    const result = await upstream.json();
    if (!upstream.ok) {
      const message = result?.error?.message || "Ошибка API генерации.";
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: message });
    }

    const image = result?.data?.[0]?.b64_json;
    if (!image) return res.status(502).json({ error: "API не вернул изображение. Попробуй ещё раз." });
    return res.status(200).json({ image });
  } catch (error) {
    return res.status(500).json({ error: "Внутренняя ошибка сервера. Попробуй ещё раз." });
  }
}

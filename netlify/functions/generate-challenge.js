exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Method not allowed",
      }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body || "{}");

    if (
      typeof prompt !== "string" ||
      !prompt.trim() ||
      prompt.length > 2500
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid prompt",
        }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Gemini API key is not configured",
        }),
      };
    }

    const model =
      process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.8,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        response.status,
        data
      );

      return {
        statusCode: 502,
        body: JSON.stringify({
          error:
            data.error?.message ||
            "Gemini API request failed",
        }),
      };
    }

    const text = (
      data.candidates?.[0]?.content?.parts || []
    )
      .map((part) => part.text || "")
      .join("")
      .trim();

    if (!text) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Gemini returned no text",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    };
  } catch (error) {
    console.error("Gemini function error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error while generating the challenge",
      }),
    };
  }
};

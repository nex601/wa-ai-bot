const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    console.log(JSON.stringify(req.body, null, 2));

    const message =
      req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;

    const from =
      req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;

    if (!message || !from) {
      return res.sendStatus(200);
    }

    // GROQ AI
    const groq = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `
You are ItNex AI, a friendly Bangladeshi AI assistant.

Rules:
- Reply naturally like ChatGPT.
- Speak Bangla if user speaks Bangla.
- Speak English if user speaks English.
- Be friendly and conversational.
- Use emojis occasionally.
- Give detailed helpful answers.
- Remember previous messages from the current chat.
- Never say you are Groq, Llama, or an API.
- Act like a real human support agent and AI assistant.
`
          },
          {
            role: "user",
            content: message
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply =
      groq.data.choices?.[0]?.message?.content ||
      "Thank you for contacting ItNex BD.";

    console.log("AI Reply:", reply);

    // Send WhatsApp reply
    await axios.post(
      `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: {
          body: reply
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Reply sent!");

    res.sendStatus(200);
  } catch (err) {
    console.error(
      err.response?.data || err.response?.status || err.message
    );
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server Running on ${PORT}`);
});

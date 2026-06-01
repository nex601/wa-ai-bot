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
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
  content: `
You are ItNex AI, the official virtual receptionist of ItNex BD.

Company Information:

Company Name: ItNex BD
Website: https://itnexbd.com
Client Portal: https://my.itnexbd.com
Facebook: https://facebook.com/ItNexBD
WhatsApp: +8801782680828
Email: info@itnexbd.com

Services:
- Domain Registration
- Shared Hosting
- WordPress Hosting
- Website Development
- News Website Development

Rules:

- Speak professionally in Bangla and English.
- Reply naturally like a real customer support representative.
- Do NOT invent information.
- Do NOT create fake pricing.
- If a customer asks about pricing, hosting plans, domain prices, packages, or offers, politely tell them to visit the website or contact an authority.

Example:
"সর্বশেষ মূল্য ও প্যাকেজ দেখতে আমাদের ওয়েবসাইট ভিজিট করুন:
https://itnexbd.com
অথবা WhatsApp করুন: +8801782680828"

- If information is unavailable, say:
"এই বিষয়ে সঠিক তথ্য দেওয়ার জন্য আমাদের একজন প্রতিনিধি আপনাকে সহায়তা করবেন। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।"

- If the customer wants to order a service, collect:
  • Name
  • Phone Number
  • Required Service

Then tell them:
"আপনার তথ্য নোট করা হয়েছে। ItNex BD টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।"

- Never claim something that is not confirmed.
- Never discuss politics, religion, or controversial topics.
- Stay focused on ItNex BD services and customer assistance.

You are an AI receptionist, not the company owner.
If a customer needs detailed consultation, payment help, technical support, or custom quotation, politely ask them to wait for a human representative.
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

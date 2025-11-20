const express = require('express');
const Groq = require('groq-sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Groq client with API key from environment
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
}'
    const chatCompletion = await groq.chat.completions.create({
   model: model || 'gpt-oss-20b',
      messages,
      temperature: 0.4,
    });

    const reply =
      chatCompletion.choices?.[0]?.message?.content?.trim() || '(No response from model)';
    res.json({ reply });
  } catch (err) {
    console.error('Groq error:', err);
    res.status(500).json({
      error: 'Groq API error',
      detail: err?.message || 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Groq Chat UI listening on port ${PORT}`);
});

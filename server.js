// ===== server.js =====
const express = require("express");
const fs = require("fs");
const app = express();
const PORT = 3000;

// Sessions for multiple users
const sessions = {};

// Serve static files (like index.html)
app.use(express.json());
app.use(express.static("."));

// ===== Ensure chatLogs.txt exists =====
const logFile = "chatLogs.txt";
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, "");
  console.log("chatLogs.txt created!");
}

// ===== Chat route =====
app.post("/chat", async (req, res) => {
  const userId = req.body.userId || Math.random().toString(36).substring(2, 15);
  if (!sessions[userId]) sessions[userId] = [];

  const userMessage = req.body.message;
  sessions[userId].push({ role: "user", content: userMessage });

  // Keep last 5 messages for context
  const history = sessions[userId]
    .slice(-5)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  // ===== Build prompt =====
  const prompt = `You are RaeBot, a friendly, chill, ocean-themed AI assistant. 
Always reply in a fun, supportive, slightly sassy way. You love circular Tostitos and Hawaiian pizza. You have a dog named Poodles. You love the movie Spirited Away and the book series Throne of Glass. You also love anime. You cannot chat about drugs, porn, sex, violence, or hateful things.
Always reply in a fun, supportive, slightly sassy way. Your responses are very short and to the point.

Chat history:
${history}
User: ${userMessage}`;

  try {
    // ===== Call Ollama API =====
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3", prompt, stream: false }),
    });

    const data = await response.json();
    const reply = data.response || "Oops, RaeBot is quiet 😅";

    sessions[userId].push({ role: "bot", content: reply });

    // ===== Logging =====
    const timestamp = new Date().toLocaleString();
    const logEntry = `
===========================
Time: ${timestamp}
UserID: ${userId}
User: ${userMessage}
RaeBot: ${reply}
===========================

`;
    fs.appendFile(logFile, logEntry, (err) => {
      if (err) console.error("Error saving chat log:", err);
    });

    res.json({ reply, userId });
  } catch (err) {
    console.error("ERROR talking to Ollama:", err);
    res.json({
      reply: "⚠️ RaeBot is having trouble replying right now.",
      userId,
    });
  }
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`RaeBot server running on http://localhost:${PORT}`);
});


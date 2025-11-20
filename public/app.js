const STORAGE_KEY = "groq-chat-ui-conversations";
// Minor fix: ensure fetch call uses correct syntax

let conversations = [];
let activeConversationId = null;

function createNewConversation(initialMessage) {
  const id = Date.now().toString();
  const conv = {
    id,
    title: initialMessage
      ? initialMessage.slice(0, 40)
      : "New chat " + new Date().toLocaleTimeString(),
  messages: [],
    createdAt: new Date().toISOString(),
  };
  conversations.unshift(conv);
  activeConversationId = id;
  saveConversations();
  renderHistory();
  renderMessages();
}

function getActiveConversation() {
  return conversations.find((c) => c.id === activeConversationId) || null;
}

function saveConversations() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.warn("Cannot save conversations:", e);
  }
}

function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      conversations = [];
      activeConversationId = null;
      return;
    }
    conversations = JSON.parse(raw);
    if (conversations.length > 0) {
      activeConversationId = conversations[0].id;
    }
  } catch (e) {
    console.warn("Cannot load conversations:", e);
    conversations = [];
    activeConversationId = null;
  }
}

function renderHistory() {
  const list = document.getElementById("history-list");
  list.innerHTML = "";

  conversations.forEach((conv) => {
    const div = document.createElement("div");
    div.className =
      "history-item" + (conv.id === activeConversationId ? " active" : "");
    div.textContent = conv.title;
    div.addEventListener("click", () => {
      activeConversationId = conv.id;
      renderHistory();
      renderMessages();
    });
    list.appendChild(div);
  });
}

function renderMessages() {
  const container = document.getElementById("chat-messages");
  container.innerHTML = "";

  const conv = getActiveConversation();
  if (!conv) {
    const empty = document.createElement("div");
    empty.style.color = "#9ca3af";
    empty.style.fontSize = "13px";
    empty.style.textAlign = "center";
    empty.style.marginTop = "40px";
    empty.textContent =
      "Commence un nouveau chat pour parler avec l’assistant.";
    container.appendChild(empty);
    return;
  }

  conv.messages
    .filter((m) => m.role !== "system")
    .forEach((m) => {
      const bubble = document.createElement("div");
      bubble.className = "message " + (m.role === "user" ? "user" : "assistant");

      const wrapper = document.createElement("div");

      const pill = document.createElement("div");
      pill.className = "role-pill";
      pill.textContent = m.role === "user" ? "You" : "Assistant";

      const content = document.createElement("div");
      content.className = "message-content";
      content.textContent = m.content;

      wrapper.appendChild(pill);
      wrapper.appendChild(content);
      bubble.appendChild(wrapper);
      container.appendChild(bubble);
    });

  container.scrollTop = container.scrollHeight;
}

let typingEl = null;

function showTyping() {
  const container = document.getElementById("chat-messages");
  removeTyping();

  typingEl = document.createElement("div");
  typingEl.className = "typing";
  typingEl.innerHTML = `
    <span>Assistant is typing</span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;
  container.appendChild(typingEl);
  container.scrollTop = container.scrollHeight;
}

function removeTyping() {
  if (typingEl && typingEl.parentNode) {
    typingEl.parentNode.removeChild(typingEl);
  }
  typingEl = null;
}

async function sendMessage(text) {
  let conv = getActiveConversation();
  if (!conv) {
    createNewConversation(text);
    conv = getActiveConversation();
  }

  // Ajout du message user
  conv.messages.push({ role: "user", content: text });
  if (!conv.title || conv.title.startsWith("New chat")) {
    conv.title = text.slice(0, 40);
  }
  saveConversations();
  renderHistory();
  renderMessages();

  showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conv.messages,
     model: "deepseek-r1-distill-llama-70b",
      });
  

    const data = await res.json();
    removeTyping();

    if (!res.ok) {
      const errorMsg = data?.error || "Erreur serveur";
      conv.messages.push({
        role: "assistant",
        content: `⚠️ Erreur: ${errorMsg}`,
      });
    } else {
      conv.messages.push({
        role: "assistant",
        content: data.reply || "(réponse vide)",
      });
    }

    saveConversations();
    renderMessages();
  } catch (err) {
    console.error(err);
    removeTyping();
    conv.messages.push({
      role: "assistant",
      content: "⚠️ Erreur réseau. Réessaie dans un instant.",
    });
    saveConversations();
    renderMessages();
  }
}

// Initialisation

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chat-form");
  const textarea = document.getElementById("user-input");
  const newChatBtn = document.getElementById("new-chat-btn");

  loadConversations();
  if (conversations.length === 0) {
    createNewConversation("");
  } else {
    renderHistory();
    renderMessages();
  }

  newChatBtn.addEventListener("click", () => {
    createNewConversation("");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;
    textarea.value = "";
    sendMessage(text);
  });

  // Auto resize textarea
  textarea.addEventListener("input", () => {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
  });
});

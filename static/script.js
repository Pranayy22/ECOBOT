let currentChatId = "1";
let isSpeaking = false;
let synth = window.speechSynthesis;

document.getElementById("dark-mode-toggle").addEventListener("click", function() {
    document.body.classList.toggle("light-mode");
    this.textContent = document.body.classList.contains("light-mode") ? "🌞 Light Mode" : "🌙 Dark Mode";
});

// 🎙️ Mic Toggle (Fixed)
document.getElementById("mic-toggle").addEventListener("click", function() {
    isSpeaking = !isSpeaking; // 🔄 Toggle Speak Mode
    if (isSpeaking) {
        let lastBotMessage = document.querySelector(".message.bot:last-child");
        if (lastBotMessage) {
            speak(lastBotMessage.textContent);
        }
    } else {
        synth.cancel(); // 🔇 Stop Speaking
    }
});

// 🔊 Speak Function (Now Works Correctly)
function speak(text) {
    if (!text) return;

    let speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.onend = () => { isSpeaking = false; };

    synth.speak(speech);
}

// 🎯 Send Message Function (Fixed)
function sendMessage() {
    let userInput = document.getElementById("user-input").value.trim();
    if (userInput === "") return;

    let chatBox = document.getElementById("chat-box");

    let userMessage = document.createElement("div");
    userMessage.className = "message user";
    userMessage.textContent = userInput;
    chatBox.appendChild(userMessage);

    let botMessageContainer = document.createElement("div");
    botMessageContainer.className = "bot-container";

    let botMessage = document.createElement("div");
    botMessage.className = "message bot";
    botMessage.textContent = "Thinking...";

    botMessageContainer.appendChild(botMessage);
    chatBox.appendChild(botMessageContainer);

    fetch("/chat", {
        method: "POST",
        body: JSON.stringify({ message: userInput, chat_id: currentChatId }),
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
        botMessage.textContent = data.response;

        // 🔊 Speak Automatically If Mic is ON
        if (isSpeaking) {
            speak(data.response);
        }
    });

    document.getElementById("user-input").value = "";
}
document.getElementById("user-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") { // 🎯 जब Enter दबे
        sendMessage(); // 📩 Message Send करो
    }
});


// 🎤 Voice Input (Speech-to-Text)
document.getElementById("mic-btn").addEventListener("click", function() {
    let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = function(event) {
        let transcript = event.results[0][0].transcript;
        document.getElementById("user-input").value = transcript;
        sendMessage(); // 🎤 Automatically Send Message After Speech
    };
});

// 🆕 Start New Chat
function newChat() {
    fetch("/new_chat", { method: "POST" })
        .then(response => response.json())
        .then(data => {
            currentChatId = data.chat_id;
            document.getElementById("chat-box").innerHTML = "";
            updateChatHistory();
        });
}

// 📜 Load Chat History
function loadChat(chatId) {
    currentChatId = chatId;
    fetch("/get_chat", {
        method: "POST",
        body: JSON.stringify({ chat_id: chatId }),
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
        let chatBox = document.getElementById("chat-box");
        chatBox.innerHTML = "";
        data.messages.forEach(msg => {
            let userMessage = document.createElement("div");
            userMessage.className = "message user";
            userMessage.textContent = msg.user;
            chatBox.appendChild(userMessage);

            let botMessage = document.createElement("div");
            botMessage.className = "message bot";
            botMessage.textContent = msg.bot;
            chatBox.appendChild(botMessage);
        });
    });
}

// 🗑️ Delete Chat
function deleteChat(chatId) {
    fetch("/delete_chat", {
        method: "POST",
        body: JSON.stringify({ chat_id: chatId }),
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(() => {
        updateChatHistory();
    });
}

// 🔄 Update Chat History
function updateChatHistory() {
    fetch("/")
        .then(response => response.text())
        .then(html => {
            let parser = new DOMParser();
            let doc = parser.parseFromString(html, "text/html");
            document.getElementById("chat-history").innerHTML = doc.getElementById("chat-history").innerHTML;
        });
}

// ⚙️ Open Settings
function openSettings() {
    window.location.href = "settings.html";
}

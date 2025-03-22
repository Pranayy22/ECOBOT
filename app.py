from flask import Flask, render_template, request, jsonify
import g4f  # Free GPT-4 API
import json
import os
import webview  # PyWebView for Desktop UI
import threading
import speech_recognition as sr  # Mic Input ke liye

app = Flask(__name__)

CHAT_HISTORY_FILE = "chat_history.json"


# Load chat history
def load_chat_history():
    if os.path.exists(CHAT_HISTORY_FILE):
        with open(CHAT_HISTORY_FILE, "r") as file:
            return json.load(file)
    return {}


# Save chat history
def save_chat_history(history):
    with open(CHAT_HISTORY_FILE, "w") as file:
        json.dump(history, file)


# Delete chat history
def delete_chat(chat_id):
    chat_history = load_chat_history()
    if chat_id in chat_history:
        del chat_history[chat_id]
    save_chat_history(chat_history)


# Continuous Chatbot function (Maintains context)
def chat_with_ecobot(user_input, chat_id):
    chat_history = load_chat_history()

    if chat_id not in chat_history:
        chat_history[chat_id] = []

    messages = []
    for msg in chat_history[chat_id]:
        if "user" in msg and "bot" in msg:
            messages.append({"role": "user", "content": msg["user"]})
            messages.append({"role": "assistant", "content": msg["bot"]})

    messages.append({"role": "user", "content": user_input})

    response = g4f.ChatCompletion.create(
        model="gpt-4",
        messages=messages
    )

    chat_history[chat_id].append({"user": user_input, "bot": response})
    save_chat_history(chat_history)

    return response


@app.route("/")
def home():
    chat_history = load_chat_history()
    return render_template("index.html", chat_history=chat_history)


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    user_input = data.get("message")
    chat_id = data.get("chat_id")

    if not user_input or not chat_id:
        return jsonify({"error": "Invalid request"}), 400

    bot_response = chat_with_ecobot(user_input, chat_id)

    chat_history = load_chat_history()
    if chat_id not in chat_history:
        chat_history[chat_id] = []

    chat_history[chat_id].append({"user": user_input, "bot": bot_response})
    save_chat_history(chat_history)

    return jsonify({"response": bot_response})


@app.route("/voice_input", methods=["GET"])
def voice_input():
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening...")
        recognizer.adjust_for_ambient_noise(source)
        audio = recognizer.listen(source)

    try:
        text = recognizer.recognize_google(audio)
        return jsonify({"message": text})
    except sr.UnknownValueError:
        return jsonify({"message": "Sorry, I couldn't understand."})
    except sr.RequestError:
        return jsonify({"message": "Speech service not available."})


@app.route("/new_chat", methods=["POST"])
def new_chat():
    chat_history = load_chat_history()
    new_chat_id = str(len(chat_history) + 1)
    chat_history[new_chat_id] = []
    save_chat_history(chat_history)

    return jsonify({"chat_id": new_chat_id})


@app.route("/get_chat", methods=["POST"])
def get_chat():
    chat_id = request.json.get("chat_id")
    chat_history = load_chat_history()
    return jsonify({"messages": chat_history.get(chat_id, [])})


@app.route("/delete_chat", methods=["POST"])
def delete_chat_route():
    chat_id = request.json.get("chat_id")
    delete_chat(chat_id)
    return jsonify({"status": "deleted"})


# Flask Server ko WebView ke saath Start karna
def start_flask():
    app.run(port=5000)


if __name__ == "__main__":
    flask_thread = threading.Thread(target=start_flask)
    flask_thread.daemon = True
    flask_thread.start()

    webview.create_window("ECOBOT - AI Chatbot", "http://127.0.0.1:5000")
    webview.start()

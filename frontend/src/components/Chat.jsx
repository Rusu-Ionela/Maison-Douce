import React, { useEffect, useRef, useState } from "react";
import { getSocket } from "/src/lib/socket.js";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, data]);
    });
    return () => {
      socket.off("receiveMessage");
    };
  }, []);

  const sendMessage = () => {
    const text = message.trim();
    if (!text) return;
    const socket = socketRef.current;
    if (socket && !socket.connected) {
      try {
        socket.connect();
      } catch {}
    }
    socket?.emit("sendMessage", { text, utilizator: "Client" });
    setMessage("");
  };

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid gray",
        width: "400px",
        margin: "auto",
      }}
    >
      <h3>Chat client</h3>
      <div
        style={{
          height: "200px",
          overflowY: "scroll",
          border: "1px solid lightgray",
          padding: "10px",
        }}
      >
        {messages.map((msg, index) => (
          <div key={index} style={{ margin: "5px 0" }}>
            {msg.text || msg}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ width: "300px", marginRight: "10px" }}
      />
      <button onClick={sendMessage}>Trimite</button>
    </div>
  );
}

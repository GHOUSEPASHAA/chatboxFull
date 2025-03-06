import React, { useState, useEffect, useRef } from "react";
import VoiceCall from "./VoiceCall";
import { PhoneIcon } from "@heroicons/react/24/outline";

const safeRender = (value, fallback = "Unknown") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.name) return value.name;
  return JSON.stringify(value);
};

const CallHandler = ({ socket, token, users, selectedChat, setSelectedChat, chatType, setChatType, setNotifications }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const ringtoneRef = useRef(null);

  useEffect(() => {
    ringtoneRef.current = new Audio("/ringtone.mp3");
    ringtoneRef.current.loop = true;
  }, []);

  useEffect(() => {
    if (incomingCall && !isCallActive) {
      ringtoneRef.current.play().catch((err) => console.error("Ringtone error:", err));
    } else {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, [incomingCall, isCallActive]);

  useEffect(() => {
    if (socket.current) {
      socket.current.on("callRequest", ({ from }) => {
        const senderName = safeRender(users.find((u) => u._id === from)?.name, "Someone");
        setIncomingCall({ from, senderName });
      });

      socket.current.on("callAccepted", () => {
        setIsCallActive(true);
        setIncomingCall(null);
      });

      socket.current.on("callRejected", () => {
        setNotifications((prev) => [...prev, { id: Date.now(), text: "Call rejected" }]);
        setIncomingCall(null);
      });

      socket.current.on("callEnded", () => {
        setIsCallActive(false);
        setIncomingCall(null);
      });
    }
  }, [socket, users, setNotifications]);

  const initiateCall = () => {
    if (chatType === "user" && selectedChat) {
      socket.current.emit("callRequest", { to: selectedChat });
    }
  };

  const acceptCall = () => {
    socket.current.emit("callAccepted", { to: incomingCall.from });
    setSelectedChat(incomingCall.from);
    setChatType("user");
    setIsCallActive(true);
    setIncomingCall(null);
  };

  const rejectCall = () => {
    socket.current.emit("callRejected", { to: incomingCall.from });
    setIncomingCall(null);
  };

  const endCall = () => {
    socket.current.emit("callEnded", { to: selectedChat });
    setIsCallActive(false);
  };

  return (
    <>
      {isCallActive && (
        <VoiceCall
          endCall={endCall}
          userName={safeRender(users.find((u) => u._id === selectedChat)?.name)}
          socket={socket}
          selectedUser={selectedChat}
        />
      )}
      {chatType === "user" && selectedChat && !isCallActive && (
        <div className="flex items-center space-x-4 absolute top-6 right-6">
          <button onClick={initiateCall} className="text-white hover:text-gray-200">
            <PhoneIcon className="h-6 w-6" />
          </button>
        </div>
      )}
      {incomingCall && !isCallActive && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg z-50">
          <p className="text-lg font-semibold text-gray-800">Incoming Call from {incomingCall.senderName}</p>
          <div className="flex justify-around mt-4">
            <button onClick={acceptCall} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
              Accept
            </button>
            <button onClick={rejectCall} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
              Reject
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CallHandler;
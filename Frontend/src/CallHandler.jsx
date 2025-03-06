import React, { useState, useEffect, useRef } from "react";
import VoiceCall from "./VoiceCall";
import { PhoneIcon } from "@heroicons/react/24/outline";

const safeRender = (value, fallback = "Unknown") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.name) return value.name;
  return JSON.stringify(value);
};

const CallHandler = ({ socket, token, users, groups, selectedChat, setSelectedChat, chatType, setChatType, setNotifications }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingGroupCall, setIncomingGroupCall] = useState(null);
  const [groupCallParticipants, setGroupCallParticipants] = useState([]);
  const ringtoneRef = useRef(null);

  useEffect(() => {
    ringtoneRef.current = new Audio("/ringtone.mp3");
    ringtoneRef.current.loop = true;
  }, []);

  useEffect(() => {
    if ((incomingCall || incomingGroupCall) && !isCallActive) {
      ringtoneRef.current.play().catch((err) => console.error("Ringtone error:", err));
    } else {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, [incomingCall, incomingGroupCall, isCallActive]);

  useEffect(() => {
    if (socket.current) {
      socket.current.on("callRequest", ({ from }) => {
        console.log("Received callRequest from:", from);
        const senderName = safeRender(users.find((u) => u._id === from)?.name, "Someone");
        setIncomingCall({ from, senderName });
      });

      socket.current.on("callAccepted", () => {
        console.log("Call accepted");
        setIsCallActive(true);
        setIncomingCall(null);
      });

      socket.current.on("callRejected", () => {
        console.log("Call rejected");
        setNotifications((prev) => [...prev, { id: Date.now(), text: "Call rejected", read: false, timestamp: new Date() }]);
        setIncomingCall(null);
      });

      socket.current.on("callEnded", () => {
        console.log("Call ended");
        setIsCallActive(false);
        setIncomingCall(null);
        setGroupCallParticipants([]);
      });

      socket.current.on("groupCallStarted", ({ groupId, callerId }) => {
        console.log("Group call started for group:", groupId, "by caller:", callerId);
        const group = groups.find((g) => g._id === groupId);
        if (!group) {
          console.error("Group not found:", groupId);
          return;
        }
        const participants = users
          .filter((u) => group.members.some((m) => safeRender(m.userId?._id || m.userId) === u._id))
          .map((u) => u._id);
        console.log("Participants:", participants);

        if (socket.current.userId === callerId) {
          // Caller auto-joins the call
          setGroupCallParticipants(participants);
          setSelectedChat(groupId);
          setChatType("group");
          setIsCallActive(true);
        } else {
          // Non-callers see the incoming call popup
          setIncomingGroupCall({ groupId, groupName: safeRender(group.name), callerId });
        }

        setNotifications((prev) => [
          ...prev,
          { id: Date.now(), text: `Group call started in ${safeRender(group.name)}`, read: false, timestamp: new Date() },
        ]);
      });

      socket.current.on("groupCallEnded", () => {
        console.log("Group call ended");
        setIsCallActive(false);
        setGroupCallParticipants([]);
        setIncomingGroupCall(null);
      });
    }

    return () => {
      if (socket.current) {
        socket.current.off("callRequest");
        socket.current.off("callAccepted");
        socket.current.off("callRejected");
        socket.current.off("callEnded");
        socket.current.off("groupCallStarted");
        socket.current.off("groupCallEnded");
      }
    };
  }, [socket, users, groups, setNotifications]);

  const initiateCall = () => {
    if (chatType === "user" && selectedChat) {
      console.log("Initiating call to:", selectedChat);
      socket.current.emit("callRequest", { to: selectedChat });
    }
  };

  const acceptCall = () => {
    console.log("Accepting call from:", incomingCall.from);
    socket.current.emit("callAccepted", { to: incomingCall.from });
    setSelectedChat(incomingCall.from);
    setChatType("user");
    setIsCallActive(true);
    setIncomingCall(null);
  };

  const rejectCall = () => {
    console.log("Rejecting call from:", incomingCall.from);
    socket.current.emit("callRejected", { to: incomingCall.from });
    setIncomingCall(null);
  };

  const acceptGroupCall = () => {
    const group = groups.find((g) => g._id === incomingGroupCall.groupId);
    const participants = users
      .filter((u) => group.members.some((m) => safeRender(m.userId?._id || m.userId) === u._id))
      .map((u) => u._id);
    setGroupCallParticipants(participants);
    setSelectedChat(incomingGroupCall.groupId);
    setChatType("group");
    setIsCallActive(true);
    setIncomingGroupCall(null);
  };

  const rejectGroupCall = () => {
    setIncomingGroupCall(null);
  };

  const endCall = () => {
    if (chatType === "user") {
      console.log("Ending one-on-one call with:", selectedChat);
      socket.current.emit("callEnded", { to: selectedChat });
    } else if (chatType === "group") {
      console.log("Ending group call for:", selectedChat);
      socket.current.emit("endGroupCall", { groupId: selectedChat });
    }
    setIsCallActive(false);
    setGroupCallParticipants([]);
  };

  return (
    <>
      {isCallActive && (
        <VoiceCall
          endCall={endCall}
          userName={
            chatType === "user"
              ? safeRender(users.find((u) => u._id === selectedChat)?.name)
              : safeRender(groups.find((g) => g._id === selectedChat)?.name)
          }
          socket={socket}
          selectedUser={chatType === "user" ? selectedChat : null}
          groupParticipants={chatType === "group" ? groupCallParticipants : []}
          isGroupCall={chatType === "group"}
          safeRender={safeRender}
          users={users}
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
      {incomingGroupCall && !isCallActive && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg z-50">
          <p className="text-lg font-semibold text-gray-800">Incoming Group Call in {incomingGroupCall.groupName}</p>
          <div className="flex justify-around mt-4">
            <button onClick={acceptGroupCall} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
              Join
            </button>
            <button onClick={rejectGroupCall} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
              Decline
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CallHandler;
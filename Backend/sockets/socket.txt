const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const Group = require("../models/Group");
const { JWT_SECRET } = require("../middleware/auth");
const { encryptMessage } = require("../utils/encryption");

const socketHandler = (io) => {
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        const token = socket.handshake.auth.token;
        if (!token) {
            console.log("No token provided, disconnecting:", socket.id);
            socket.disconnect(true);
            return;
        }

        let userId;
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
            socket.userId = userId;
            socket.join(userId); // Join user's personal room
            socket.emit("userId", userId);
            console.log(`User ${userId} authenticated and joined personal room`);
        } catch (err) {
            console.error("Connection token error:", err.message);
            socket.disconnect(true);
            return;
        }

        socket.on("joinGroup", (groupId) => {
            socket.join(groupId);
            console.log(`User ${socket.userId} joined group room ${groupId}`);
        });

        socket.on("leaveGroup", (groupId) => {
            socket.leave(groupId);
            console.log(`User ${socket.userId} left group room ${groupId}`);
        });

        socket.on("chatMessage", async (msgData) => {
            try {
                const sender = await User.findById(socket.userId).lean();
                if (!sender) throw new Error("Sender not found");

                if (msgData.group) {
                    const group = await Group.findById(msgData.group);
                    if (!group) throw new Error("Group not found");
                    const member = group.members.find((m) => m.userId.toString() === socket.userId);
                    if (
                        group.creator.toString() !== socket.userId &&
                        (!member || !member.canSendMessages)
                    ) {
                        socket.emit("error", { message: "No permission to send messages in this group" });
                        return;
                    }
                }

                if (msgData.file) {
                    const fileMessage = {
                        sender: { _id: socket.userId, name: sender.name },
                        file: msgData.file,
                        recipient: msgData.recipient || null,
                        group: msgData.group || null,
                        tempId: msgData.tempId,
                        timestamp: new Date(),
                    };
                    if (msgData.recipient) {
                        io.to(msgData.recipient).emit("chatMessage", fileMessage);
                        io.to(socket.userId).emit("chatMessage", fileMessage);
                    } else if (msgData.group) {
                        io.to(msgData.group).emit("chatMessage", fileMessage);
                    }
                    return;
                }

                let message = {
                    sender: socket.userId,
                    timestamp: new Date(),
                    tempId: msgData.tempId,
                };

                if (msgData.recipient) {
                    const recipient = await User.findById(msgData.recipient).lean();
                    if (!recipient) throw new Error("Recipient not found");

                    const encryptedContent = encryptMessage(msgData.content, recipient.publicKey);
                    message.plaintextContent = msgData.content;
                    message.encryptedContent = encryptedContent;
                    message.recipient = msgData.recipient;

                    const savedMessage = await Message.create(message);
                    const populatedMessage = await Message.findById(savedMessage._id)
                        .populate("sender", "name")
                        .lean();

                    const recipientMessage = {
                        ...populatedMessage,
                        sender: { _id: populatedMessage.sender._id, name: populatedMessage.sender.name },
                        content: populatedMessage.encryptedContent,
                        tempId: msgData.tempId,
                    };

                    const senderMessage = {
                        ...populatedMessage,
                        sender: { _id: populatedMessage.sender._id, name: populatedMessage.sender.name },
                        content: populatedMessage.plaintextContent,
                        tempId: msgData.tempId,
                    };

                    console.log("Emitting to recipient:", recipientMessage);
                    io.to(msgData.recipient).emit("chatMessage", recipientMessage);

                    console.log("Emitting to sender:", senderMessage);
                    io.to(socket.userId).emit("chatMessage", senderMessage);
                } else if (msgData.group) {
                    message.group = msgData.group;
                    message.plaintextContent = msgData.content;
                    message.encryptedContent = null;

                    const savedMessage = await Message.create(message);
                    const populatedMessage = await Message.findById(savedMessage._id)
                        .populate("sender", "name")
                        .lean();

                    const groupMessage = {
                        ...populatedMessage,
                        sender: { _id: populatedMessage.sender._id, name: populatedMessage.sender.name },
                        content: populatedMessage.plaintextContent,
                        tempId: msgData.tempId,
                    };

                    console.log("Emitting to group:", groupMessage);
                    io.to(msgData.group).emit("chatMessage", groupMessage);
                }
            } catch (err) {
                console.error("Chat message error:", err.message);
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        socket.on("callRequest", async ({ to }) => {
            try {
                const recipient = await User.findById(to).lean();
                if (!recipient) throw new Error("Recipient not found");
                console.log(`Call request from ${socket.userId} to ${to}`);
                io.to(to).emit("callRequest", { from: socket.userId });
            } catch (err) {
                console.error("Call request error:", err.message);
                socket.emit("error", { message: "Failed to initiate call" });
            }
        });

        socket.on("callAccepted", async ({ to }) => {
            try {
                const caller = await User.findById(to).lean();
                if (!caller) throw new Error("Caller not found");
                console.log(`Call accepted by ${socket.userId} for ${to}`);
                io.to(to).emit("callAccepted");
            } catch (err) {
                console.error("Call accept error:", err.message);
                socket.emit("error", { message: "Failed to accept call" });
            }
        });

        socket.on("callRejected", async ({ to }) => {
            try {
                const caller = await User.findById(to).lean();
                if (!caller) throw new Error("Caller not found");
                console.log(`Call rejected by ${socket.userId} for ${to}`);
                io.to(to).emit("callRejected");
            } catch (err) {
                console.error("Call reject error:", err.message);
                socket.emit("error", { message: "Failed to reject call" });
            }
        });

        socket.on("callEnded", async (data) => {
            const to = data?.to; // Safely access 'to', undefined if missing
            if (!to) {
                console.log("No 'to' provided in callEnded event, skipping...");
                return;
            }
            try {
                const otherParty = await User.findById(to).lean();
                if (!otherParty) throw new Error("Other party not found");
                console.log(`Call ended between ${socket.userId} and ${to}`);
                io.to(to).emit("callEnded");
            } catch (err) {
                console.error("Call end error:", err.message);
                socket.emit("error", { message: "Failed to end call" });
            }
        });

        // WebRTC Signaling Events
        socket.on("offer", async ({ to, offer }) => {
            try {
                const recipient = await User.findById(to).lean();
                if (!recipient) throw new Error("Recipient not found");
                console.log(`Offer from ${socket.userId} to ${to}`);
                io.to(to).emit("offer", { from: socket.userId, offer });
            } catch (err) {
                console.error("Offer error:", err.message);
                socket.emit("error", { message: "Failed to send offer" });
            }
        });

        socket.on("answer", async ({ to, answer }) => {
            try {
                const caller = await User.findById(to).lean();
                if (!caller) throw new Error("Caller not found");
                console.log(`Answer from ${socket.userId} to ${to}`);
                io.to(to).emit("answer", { from: socket.userId, answer });
            } catch (err) {
                console.error("Answer error:", err.message);
                socket.emit("error", { message: "Failed to send answer" });
            }
        });

        socket.on("iceCandidate", async ({ to, candidate }) => {
            try {
                const recipient = await User.findById(to).lean();
                if (!recipient) throw new Error("Recipient not found");
                console.log(`ICE candidate from ${socket.userId} to ${to}`);
                io.to(to).emit("iceCandidate", { from: socket.userId, candidate });
            } catch (err) {
                console.error("ICE candidate error:", err.message);
                socket.emit("error", { message: "Failed to send ICE candidate" });
            }
        });

        socket.on("disconnect", async () => {
            console.log("Client disconnected:", socket.id);
            try {
                const user = await User.findById(socket.userId);
                if (user) {
                    user.status = "Offline";
                    await user.save();
                    io.emit("statusUpdate", { userId: socket.userId, status: "Offline" });
                }
            } catch (err) {
                console.error("Disconnect error:", err.message);
            }
        });
    });
};

module.exports = socketHandler;
import React, { useState, useEffect } from "react";
import axios from "axios";

const safeRender = (value, fallback = "Unknown") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.name) return value.name;
  return JSON.stringify(value);
};

const GroupManagement = ({
  token,
  users,
  groups,
  setGroups,
  setSelectedChat,
  setChatType,
  currentUserId,
  showUserProfile,
  showOnlyGroups,
  setShowOnlyGroups,
  showOnlyContacts,
  setShowOnlyContacts,
  lastMessageTimes,
  socket,
}) => {
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isGroupAdmin = (groupId) => {
    const group = groups.find((g) => g._id === groupId);
    return group && safeRender(group.creator?._id || group.creator) === currentUserId;
  };

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedMembers.length > 0) {
      axios
        .post("http://localhost:3000/api/groups", { name: groupName }, { headers: { Authorization: token } })
        .then((res) => {
          const groupId = res.data._id;
          Promise.all(
            selectedMembers.map((userId) =>
              axios.put(
                `http://localhost:3000/api/groups/${groupId}/members`,
                { userId, canSendMessages: true, canCall: true },
                { headers: { Authorization: token } }
              )
            )
          ).then(() => {
            setGroups((prev) => [...prev, res.data]);
            setGroupName("");
            setSelectedMembers([]);
            setShowCreateGroup(false);
          });
        })
        .catch((err) => console.error("Error creating group:", err));
    }
  };

  const addMemberToGroup = async (groupId, userId) => {
    if (!userId || !groupId) return;
    const canSendMessages = window.confirm(
      `Allow ${safeRender(users.find((u) => u._id === userId)?.name, userId)} to send messages?`
    );
    const canCall = window.confirm(
      `Allow ${safeRender(users.find((u) => u._id === userId)?.name, userId)} to make calls?`
    );
    try {
      const response = await axios.put(
        `http://localhost:3000/api/groups/${groupId}/members`,
        { userId, canSendMessages, canCall },
        { headers: { Authorization: token } }
      );
      setGroups((prev) => prev.map((g) => (g._id === groupId ? response.data : g)));
    } catch (error) {
      console.error("Error adding member to group:", error);
    }
  };

  const updateGroupPermissions = async (groupId, userId, canSendMessages, canCall) => {
    if (!groupId || !userId) return;
    try {
      const response = await axios.put(
        `http://localhost:3000/api/groups/${groupId}/permissions`,
        { userId, canSendMessages, canCall },
        { headers: { Authorization: token } }
      );
      setGroups((prev) => prev.map((g) => (g._id === groupId ? response.data : g)));
    } catch (error) {
      console.error("Error updating permissions:", error);
    }
  };

  const removeMemberFromGroup = async (groupId, userId) => {
    if (!window.confirm(`Are you sure you want to remove ${safeRender(users.find(u => u._id === userId)?.name, userId)} from the group?`)) {
      return;
    }
    
    try {
      const response = await axios.delete(
        `http://localhost:3000/api/groups/${groupId}/members/${userId}`,
        { headers: { Authorization: token } }
      );
      setGroups((prev) => prev.map((g) => (g._id === groupId ? response.data : g)));
    } catch (error) {
      console.error("Error removing member from group:", error);
    }
  };

  const deleteGroup = async (groupId) => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return;
    }
    
    try {
      await axios.delete(
        `http://localhost:3000/api/groups/${groupId}`,
        { headers: { Authorization: token } }
      );
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
      setEditingGroupId(null);
      setSelectedChat(null);
      setChatType(null);
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const toggleEditGroup = (groupId) => {
    setEditingGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const getLastMessageTime = (userId) => {
    const lastMessage = lastMessageTimes.find((lm) => lm.userId === userId);
    return lastMessage ? new Date(lastMessage.lastMessageTime).toLocaleTimeString() : "No messages yet";
  };

  const filteredGroups = groups.filter((group) =>
    safeRender(group.name).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter((user) =>
    safeRender(user.name).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="p-2 sm:p-4 border-b border-gray-200 space-y-3">
        <input
          type="text"
          placeholder={
            showOnlyGroups ? "Search groups..." :
            showOnlyContacts ? "Search contacts..." :
            "Search..."
          }
          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm sm:text-base"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {!showOnlyGroups && !showOnlyContacts && (
          <button
            onClick={() => setShowCreateGroup(true)}
            className="w-full p-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg hover:from-blue-500 hover:to-blue-600 text-sm sm:text-base"
          >
            Create New Group
          </button>
        )}
      </div>
      <div className="overflow-y-auto h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
        {(showOnlyGroups || (!showOnlyGroups && !showOnlyContacts)) && filteredGroups.length > 0 && (
          <div className="p-2">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-500 px-2 sm:px-4 mb-2">Groups</h2>
            {filteredGroups.map((group) => (
              <div key={group._id} className="p-2 sm:p-4">
                <div
                  className="flex items-center hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedChat(group._id);
                    setChatType("group");
                    setShowOnlyGroups(false);
                    setShowOnlyContacts(false);
                  }}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm sm:text-base">{safeRender(group.name[0])}</span>
                  </div>
                  <div className="ml-2 sm:ml-4 flex-1">
                    <p className="text-gray-800 font-medium text-sm sm:text-base">{safeRender(group.name)}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{group.members.length} members</p>
                  </div>
                  {isGroupAdmin(group._id) && !showOnlyGroups && (
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEditGroup(group._id);
                        }}
                        className={`px-2 py-1 rounded text-xs sm:text-sm ${editingGroupId === group._id ? "bg-red-500 text-white" : "bg-yellow-400 text-black"}`}
                      >
                        {editingGroupId === group._id ? "Close" : "Edit"}
                      </button>
                    </div>
                  )}
                </div>
                {editingGroupId === group._id && isGroupAdmin(group._id) && !showOnlyGroups && (
                  <div className="mt-2 p-2 bg-gray-100 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs sm:text-sm font-semibold">Members</h4>
                      <button
                        onClick={() => deleteGroup(group._id)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs sm:text-sm hover:bg-red-600"
                      >
                        Delete Group
                      </button>
                    </div>
                    {group.members.map((member, index) => (
                      <div
                        key={`${safeRender(member.userId?._id || member.userId)}-${index}`}
                        className="flex items-center justify-between mt-1 text-xs sm:text-sm"
                      >
                        <span>
                          {safeRender(users.find((u) => u._id === safeRender(member.userId?._id || member.userId))?.name, member.userId)}
                        </span>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={member.canSendMessages || false}
                              onChange={(e) =>
                                updateGroupPermissions(
                                  group._id,
                                  safeRender(member.userId?._id || member.userId),
                                  e.target.checked,
                                  member.canCall || false
                                )
                              }
                              disabled={safeRender(member.userId?._id || member.userId) === currentUserId}
                            />
                            <span className="ml-1 text-xs sm:text-sm">Can Send</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={member.canCall || false}
                              onChange={(e) =>
                                updateGroupPermissions(
                                  group._id,
                                  safeRender(member.userId?._id || member.userId),
                                  member.canSendMessages || false,
                                  e.target.checked
                                )
                              }
                              disabled={safeRender(member.userId?._id || member.userId) === currentUserId}
                            />
                            <span className="ml-1 text-xs sm:text-sm">Can Call</span>
                          </label>
                          {safeRender(member.userId?._id || member.userId) !== currentUserId && (
                            <button
                              onClick={() => removeMemberFromGroup(group._id, safeRender(member.userId?._id || member.userId))}
                              className="text-red-500 hover:text-red-700 text-xs sm:text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <h4 className="text-xs sm:text-sm font-semibold mt-2">Add Member</h4>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addMemberToGroup(group._id, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="w-full p-1 border rounded mt-1 text-xs sm:text-sm"
                      defaultValue=""
                    >
                      <option value="">Select a user</option>
                      {users.filter((u) => !group.members.some((m) => safeRender(m.userId?._id || m.userId) === u._id)).map((user) => (
                        <option key={user._id} value={user._id}>{safeRender(user.name)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {(showOnlyContacts || (!showOnlyGroups && !showOnlyContacts)) && (
          <div className="p-2">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-500 px-2 sm:px-4 mb-2">Direct Messages</h2>
            {filteredUsers.map((user) => (
              <div
                key={user._id}
                className="flex items-center p-2 sm:p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedChat(user._id);
                  setChatType("user");
                  setShowOnlyContacts(false);
                  setShowOnlyGroups(false);
                }}
              >
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full flex items-center justify-center hover:opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    showUserProfile(user._id);
                  }}
                >
                  <span className="text-white font-bold text-sm sm:text-base">{safeRender(user.name?.[0])}</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-gray-800 font-medium text-sm sm:text-base">{safeRender(user.name)}</p>
                  <p className="text-xs sm:text-sm text-gray-500">{getLastMessageTime(user._id)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateGroup && !showOnlyGroups && !showOnlyContacts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Create New Group</h2>
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500 text-sm sm:text-base"
            />
            <div className="mb-4">
              <h3 className="text-xs sm:text-sm font-semibold mb-2">Select Members</h3>
              <div className="max-h-40 sm:max-h-48 overflow-y-auto">
                {users.map((user) => (
                  <div key={user._id} className="flex items-center p-2 text-sm">
                    <input
                      type="checkbox"
                      id={`user-${user._id}`}
                      checked={selectedMembers.includes(user._id)}
                      onChange={() =>
                        setSelectedMembers((prev) =>
                          prev.includes(user._id) ? prev.filter((id) => id !== user._id) : [...prev, user._id]
                        )
                      }
                      className="mr-2"
                    />
                    <label htmlFor={`user-${user._id}`}>{safeRender(user.name)}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowCreateGroup(false)} className="px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-800 text-sm sm:text-base">
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 text-sm sm:text-base"
                disabled={!groupName.trim() || selectedMembers.length === 0}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GroupManagement;
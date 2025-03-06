const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const { authenticate } = require('../middleware/auth');

router.post('/groups', authenticate, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Group name is required' });
        const group = new Group({
            name,
            creator: req.userId,
            members: [{ userId: req.userId, canSendMessages: true, canCall: true }] // Creator has both permissions
        });
        await group.save();
        const populatedGroup = await Group.findById(group._id)
            .populate('creator', 'name')
            .populate('members.userId', 'name')
            .lean();
        const flattenedGroup = {
            ...populatedGroup,
            creator: populatedGroup.creator ? { _id: populatedGroup.creator._id, name: populatedGroup.creator.name } : populatedGroup.creator,
            members: populatedGroup.members.map(member => ({
                userId: member.userId ? { _id: member.userId._id, name: member.userId.name } : member.userId,
                canSendMessages: member.canSendMessages,
                canCall: member.canCall // Include canCall
            }))
        };
        res.status(201).json(flattenedGroup);
    } catch (error) {
        console.error('Error creating group:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/groups', authenticate, async (req, res) => {
    try {
        const groups = await Group.find({ "members.userId": req.userId })
            .populate('creator', 'name')
            .populate('members.userId', 'name')
            .lean();
        const flattenedGroups = groups.map(group => ({
            ...group,
            creator: group.creator ? { _id: group.creator._id, name: group.creator.name } : group.creator,
            members: group.members.map(member => ({
                userId: member.userId ? { _id: member.userId._id, name: member.userId.name } : member.userId,
                canSendMessages: member.canSendMessages,
                canCall: member.canCall // Include canCall
            }))
        }));
        res.json(flattenedGroups);
    } catch (error) {
        console.error('Error fetching groups:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/groups/:groupId/members', authenticate, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId, canSendMessages, canCall } = req.body; // Added canCall
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.creator.toString() !== req.userId) return res.status(403).json({ error: 'Only group admin can add members' });
        if (group.members.some(m => m.userId.toString() === userId)) return res.status(400).json({ error: 'User already in group' });

        group.members.push({ userId, canSendMessages, canCall }); // Added canCall
        await group.save();
        const updatedGroup = await Group.findById(groupId)
            .populate('creator', 'name')
            .populate('members.userId', 'name')
            .lean();
        const flattenedGroup = {
            ...updatedGroup,
            creator: updatedGroup.creator ? { _id: updatedGroup.creator._id, name: updatedGroup.creator.name } : updatedGroup.creator,
            members: updatedGroup.members.map(member => ({
                userId: member.userId ? { _id: member.userId._id, name: member.userId.name } : member.userId,
                canSendMessages: member.canSendMessages,
                canCall: member.canCall // Include canCall
            }))
        };
        res.json(flattenedGroup);
    } catch (error) {
        console.error('Error adding member to group:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/groups/:groupId/permissions', authenticate, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId, canSendMessages, canCall } = req.body; // Added canCall
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.creator.toString() !== req.userId) return res.status(403).json({ error: 'Only group admin can modify permissions' });

        const member = group.members.find(m => m.userId.toString() === userId);
        if (!member) return res.status(404).json({ error: 'Member not found' });
        if (member.userId.toString() === req.userId) return res.status(400).json({ error: 'Cannot modify admin permissions' });

        // Update permissions if provided in the request
        if (canSendMessages !== undefined) member.canSendMessages = canSendMessages;
        if (canCall !== undefined) member.canCall = canCall; // Added canCall update
        await group.save();
        const updatedGroup = await Group.findById(groupId)
            .populate('creator', 'name')
            .populate('members.userId', 'name')
            .lean();
        const flattenedGroup = {
            ...updatedGroup,
            creator: updatedGroup.creator ? { _id: updatedGroup.creator._id, name: updatedGroup.creator.name } : updatedGroup.creator,
            members: updatedGroup.members.map(member => ({
                userId: member.userId ? { _id: member.userId._id, name: member.userId.name } : member.userId,
                canSendMessages: member.canSendMessages,
                canCall: member.canCall // Include canCall
            }))
        };
        res.json(flattenedGroup);
    } catch (error) {
        console.error('Error updating group permissions:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a group
router.delete('/groups/:groupId', authenticate, async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findById(groupId);

        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.creator.toString() !== req.userId) {
            return res.status(403).json({ error: 'Only group admin can delete the group' });
        }

        await Group.deleteOne({ _id: groupId });
        res.status(200).json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error deleting group:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Remove a member from a group
router.delete('/groups/:groupId/members/:userId', authenticate, async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const group = await Group.findById(groupId);

        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.creator.toString() !== req.userId) {
            return res.status(403).json({ error: 'Only group admin can remove members' });
        }

        const memberIndex = group.members.findIndex(m => m.userId.toString() === userId);
        if (memberIndex === -1) return res.status(404).json({ error: 'Member not found in group' });
        if (group.members[memberIndex].userId.toString() === req.userId) {
            return res.status(400).json({ error: 'Admin cannot remove themselves. Delete the group instead' });
        }

        group.members.splice(memberIndex, 1);
        await group.save();

        const updatedGroup = await Group.findById(groupId)
            .populate('creator', 'name')
            .populate('members.userId', 'name')
            .lean();

        const flattenedGroup = {
            ...updatedGroup,
            creator: updatedGroup.creator ? { _id: updatedGroup.creator._id, name: updatedGroup.creator.name } : updatedGroup.creator,
            members: updatedGroup.members.map(member => ({
                userId: member.userId ? { _id: member.userId._id, name: member.userId.name } : member.userId,
                canSendMessages: member.canSendMessages,
                canCall: member.canCall
            }))
        };

        res.json(flattenedGroup);
    } catch (error) {
        console.error('Error removing member from group:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
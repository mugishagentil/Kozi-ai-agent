const { Router } = require('express');
const {
  newChat,
  chat,
  getUserChatSessions,
  deleteChatSession,
  deleteAllChatSessions,
} = require('../services/chat/admin.service');

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Admin assistant chat
 */

/**
 * @openapi
 * /api/admin/chat/new:
 *   post:
 *     summary: Start a new admin chat session
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               users_id:
 *                 type: integer
 *               firstMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Created
 */
router.post('/chat/new', newChat);

/**
 * @openapi
 * /api/admin/chat:
 *   post:
 *     summary: Send a message to the Admin Assistant
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: integer
 *                 description: Chat session id (use when sending messages in an existing session). If omitted a new session will be started.
 *               message:
 *                 type: string
 *                 description: The message content to send to the admin assistant
 *               isFirstUserMessage:
 *                 type: boolean
 *                 description: Whether this is the first user message (used to generate a title)
 *             required:
 *               - message
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional action query e.g. "loadPreviousSession" to load session history
 *     responses:
 *       200:
 *         description: AI assistant response or previous chat messages
 */
router.post('/chat', chat);

router.get('/chat/sessions', getUserChatSessions);
router.delete('/chat/session/:sessionId', deleteChatSession);
router.delete('/chat/sessions/all', deleteAllChatSessions);

module.exports = router;




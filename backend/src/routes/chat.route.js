const { Router } = require('express');
const employeeChat = require('../services/chat/employee.service');
const employerChat = require('../services/chat/employer.service');

const router = Router();

/**
 * @openapi
 * /api/chat/new:
 *   post:
 *     summary: Start a new chat session
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               users_id:
 *                 type: string
 *                 description: The ID of the user creating the session
 *               firstMessage:
 *                 type: string
 *                 description: Optional first message to auto-generate a title
 *             required:
 *               - users_id
 *     responses:
 *       200:
 *         description: Chat session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     session_id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     message:
 *                       type: string
 */
// EMPLOYEE (Job Seeker) ROUTES
router.post('/new', employeeChat.newChat);

/**
 * @openapi
 * /api/chat:
 *   post:
 *     summary: Send a message to Kozi AI assistant or load a previous chat session
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID of the chat session
 *               message:
 *                 type: string
 *                 description: The user’s message to the assistant
 *               isFirstUserMessage:
 *                 type: boolean
 *                 description: Flag to auto-generate a session title if it's the first message
 *             required:
 *               - sessionId
 *               - message
 *     responses:
 *       200:
 *         description: AI assistant response or previous chat messages
 */
router.post('/', employeeChat.chat);
router.get('/sessions', employeeChat.getUserChatSessions);
router.delete('/session/:sessionId', employeeChat.deleteChatSession);
router.delete('/sessions/all', employeeChat.deleteAllChatSessions);

// EMPLOYER (Job Provider) ROUTES
router.post('/employer/new', employerChat.newChat);
router.post('/employer', employerChat.chat);
router.get('/employer/sessions', employerChat.getUserChatSessions);
router.delete('/employer/session/:sessionId', employerChat.deleteChatSession);
router.delete('/employer/sessions/all', employerChat.deleteAllChatSessions);

module.exports = router;

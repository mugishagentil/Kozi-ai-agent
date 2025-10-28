const { Router } = require('express');
const employeeChat = require('../services/chat/employee.service');
const employerChat = require('../services/chat/employer.service');

const router = Router();

/**
 * IMPORTANT: Order matters! More specific routes (employer) must come BEFORE general routes (employee)
 * Otherwise /chat/employer will match the /chat route first
 */

// ============================================
// EMPLOYER (Job Provider) ROUTES - MUST BE FIRST
// ============================================
router.post('/employer/new', employerChat.newChat);
router.post('/employer', employerChat.chat);
router.get('/employer/sessions', employerChat.getUserChatSessions);
router.delete('/employer/session/:sessionId', employerChat.deleteChatSession);
router.delete('/employer/sessions/all', employerChat.deleteAllChatSessions);

// ============================================
// EMPLOYEE (Job Seeker) ROUTES - MUST BE LAST
// ============================================

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
 */
router.post('/new', employeeChat.newChat);

/**
 * @openapi
 * /api/chat:
 *   post:
 *     summary: Send a message to Kozi AI assistant
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
 *               message:
 *                 type: string
 *               isFirstUserMessage:
 *                 type: boolean
 */
router.post('/', employeeChat.chat);
router.get('/sessions', employeeChat.getUserChatSessions);
router.delete('/session/:sessionId', employeeChat.deleteChatSession);
router.delete('/sessions/all', employeeChat.deleteAllChatSessions);

module.exports = router;
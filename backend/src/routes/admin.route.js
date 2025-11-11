const { Router } = require('express');
const {
  newChat,
  chat,
  getUserChatSessions,
  deleteChatSession,
  deleteAllChatSessions,
} = require('../services/chat/admin.service');
const { getUpcomingPayments } = require('../services/hiredSeekers.service');

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

/**
 * @openapi
 * /api/admin/hired_seekers/upcoming_payments:
 *   get:
 *     summary: Get upcoming salary payments for hired seekers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of upcoming payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 */
router.get('/hired_seekers/upcoming_payments', async (req, res) => {
  try {
    console.log('[ROUTE] 📞 Upcoming payments endpoint called');
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    console.log('[ROUTE] Token present:', !!token);
    
    const result = await getUpcomingPayments(token);
    
    console.log('[ROUTE] Result:', { 
      success: result.success, 
      count: result.count,
      hasData: !!result.data 
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[ROUTE] ❌ Error fetching upcoming payments:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: [],
      count: 0
    });
  }
});

/**
 * @openapi
 * /api/admin/hired_seekers/test:
 *   get:
 *     summary: Test hired seekers API connection (debug endpoint)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test results
 */
router.get('/hired_seekers/test', async (req, res) => {
  try {
    const { fetchHiredSeekersFromAPI } = require('../services/hiredSeekers.service');
    
    console.log('[TEST] Testing hired seekers API connection...');
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    const result = await fetchHiredSeekersFromAPI(token);
    
    const testResults = {
      timestamp: new Date().toISOString(),
      apiUrl: process.env.JOBSEEKERS_API_BASE || 'https://apis.kozi.rw',
      endpoint: '/admin/hired_seekers',
      hasToken: !!token,
      apiCallSuccess: result.success,
      hiredSeekersCount: result.count,
      error: result.error || null,
      sampleData: result.data && result.data.length > 0 ? {
        hired_id: result.data[0].hired_id,
        seeker_name: `${result.data[0].seeker_first_name} ${result.data[0].seeker_last_name}`,
        provider_name: `${result.data[0].provider_first_name} ${result.data[0].provider_last_name}`,
        hire_date: result.data[0].date,
        has_job_description: !!result.data[0].job_description,
        job_description_preview: result.data[0].job_description ? 
          result.data[0].job_description.substring(0, 100) + '...' : null
      } : null
    };
    
    console.log('[TEST] Results:', testResults);
    
    res.status(200).json({
      success: true,
      test: testResults,
      message: result.success ? 
        '✅ API connection successful!' : 
        '❌ API connection failed. Check logs for details.'
    });
  } catch (error) {
    console.error('[TEST] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Test failed with error'
    });
  }
});

module.exports = router;




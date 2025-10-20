const { Router } = require('express');
const { GmailAgentService } = require('../services/gmail.service');

const router = Router();
const gmail = new GmailAgentService();

/**
 * @openapi
 * tags:
 *   - name: Gmail
 *     description: Gmail AI support
 */

/**
 * @openapi
 * /api/gmail/process:
 *   post:
 *     summary: Process Gmail request
 *     tags: [Gmail]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: The Gmail request message
 *             required:
 *               - message
 *     responses:
 *       200:
 *         description: Gmail AI response
 */
router.post('/process', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await gmail.invoke(message);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Gmail route error:', error);
    res.status(500).json({ 
      error: 'Gmail processing failed',
      message: error.message 
    });
  }
});

module.exports = router;




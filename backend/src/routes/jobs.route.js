const { Router } = require('express');
const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Jobs
 *     description: Job listings endpoints
 */

/**
 * @openapi
 * /api/jobs/list:
 *   get:
 *     summary: Get all job listings with company logos
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of jobs with company information including logos
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/list', async (req, res) => {
  try {
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch jobs from external API
    const externalApiUrl = 'https://apis.kozi.rw/admin/select_jobss';
    
    const response = await fetch(externalApiUrl, {
      headers: { 
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[JOBS PROXY] External API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Failed to fetch jobs from external API',
        details: errorText 
      });
    }

    const jobs = await response.json();

    // If jobs is not an array, return as-is
    if (!Array.isArray(jobs)) {
      console.warn('[JOBS PROXY] Response is not an array:', typeof jobs);
      return res.json(jobs);
    }

    // Jobs already come with logo field from external API
    // Just ensure the field exists and pass through
    const jobsWithLogos = jobs.map(job => ({
      ...job,
      // Ensure logo field exists (use existing logo or fallback to company image)
      logo: job.logo || job.company_logo || job.image || null
    }));

    res.json(jobsWithLogos);

  } catch (error) {
    console.error('[JOBS PROXY] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * @openapi
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a single job by ID
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job details with company information
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const token = req.headers.authorization;
    const jobId = req.params.id;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch single job from external API
    const externalApiUrl = `https://apis.kozi.rw/admin/select_job/${jobId}`;
    
    const response = await fetch(externalApiUrl, {
      headers: { 
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[JOBS PROXY] External API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Failed to fetch job from external API',
        details: errorText 
      });
    }

    const job = await response.json();

    // Ensure logo field exists
    const jobWithLogo = {
      ...job,
      logo: job.logo || job.company_logo || job.image || null
    };

    res.json(jobWithLogo);

  } catch (error) {
    console.error('[JOBS PROXY] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router;





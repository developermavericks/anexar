const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

exports.getEPapersByDate = onRequest(
  { timeoutSeconds: 60, memory: '256MiB', cors: true },
  async (req, res) => {
    // Only allow GET requests
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed. Use GET.' });
      return;
    }

    if (!admin.apps.length) admin.initializeApp();
    const db = admin.firestore();

    // Get date parameter, or default to today's date in IST (Asia/Kolkata)
    let date = req.query.date;
    if (!date) {
      const todayIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const year = todayIST.getFullYear();
      const month = String(todayIST.getMonth() + 1).padStart(2, '0');
      const day = String(todayIST.getDate()).padStart(2, '0');
      date = `${year}-${month}-${day}`;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }

    try {
      console.log(`Fetching ePapers for date: ${date}`);
      const colRef = db.collection('epapers');
      const snapshot = await colRef.where('date', '==', date).get();

      const papers = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        papers.push({
          id: doc.id,
          name: data.name,
          date: data.date,
          pdfUrl: data.pdfUrl,
          uploadedBy: data.uploadedBy,
          createdAt: data.createdAt
        });
      });

      res.status(200).json({
        date,
        count: papers.length,
        papers
      });
    } catch (err) {
      console.error('Error fetching ePapers:', err.message);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

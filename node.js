// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Your email configuration - store these as Heroku environment variables
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // Where to send notifications
const API_KEY = process.env.API_KEY; // Your Heroku API key for authentication

// Middleware
app.use(bodyParser.json());

// Authentication middleware
function authenticateRequest(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  // Verify API key
  if (token !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid token' });
  }
  
  next();
}

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or another service
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// Notification endpoint
app.post('/notify', authenticateRequest, async (req, res) => {
  try {
    const { type, username, timestamp } = req.body;
    
    if (!type || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Configure email based on notification type
    let subject, text;
    
    switch (type) {
      case 'Access Request':
        subject = `🔔 New Access Request from ${username}`;
        text = `User ${username} has requested access to the Google Maps Scraper extension at ${timestamp}.`;
        break;
      case 'Access Approved':
        subject = `✅ Access Approved for ${username}`;
        text = `You have approved access for user ${username} at ${timestamp}.`;
        break;
      case 'Access Denied':
        subject = `❌ Access Denied for ${username}`;
        text = `You have denied access for user ${username} at ${timestamp}.`;
        break;
      default:
        subject = `Google Maps Scraper Notification`;
        text = `Notification regarding user ${username} at ${timestamp}.`;
    }
    
    // Send email
    await transporter.sendMail({
      from: EMAIL_USER,
      to: ADMIN_EMAIL,
      subject,
      text
    });
    
    res.status(200).json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
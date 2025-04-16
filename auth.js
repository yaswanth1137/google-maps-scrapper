/*
import { auth, db } from './firebase-config.js';
const usersRef = db.collection('users');
const EMAIL_SERVICE_URL = "https://script.google.com/macros/s/AKfycbxZ57JQ5t_3dac9yEG3QBx-Q-NH1cxk7voE_eEDPGxDP4vEJqBpeqzhRYE8-kuW0AEl/exec";

// Authentication state management
const AUTH_STATES = {
  NOT_LOGGED_IN: 'not_logged_in',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  ADMIN: 'admin'
};

document.addEventListener('DOMContentLoaded', () => {
  // Form toggling
  document.getElementById('showRegisterBtn').addEventListener('click', toggleForms);
  document.getElementById('showLoginBtn').addEventListener('click', toggleForms);
  
  // Core auth handlers
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('registerBtn').addEventListener('click', handleRegister);

  // Admin actions
  document.getElementById('adminPanel').addEventListener('click', e => {
    if (e.target.classList.contains('approve-btn')) {
      approveUser(e.target.dataset.userid);
    } else if (e.target.classList.contains('deny-btn')) {
      denyUser(e.target.dataset.userid);
    }
  });

  checkLoginStatus();
});

async function handleLogin() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  try {
    const { user } = await auth.signInWithEmailAndPassword(email, password);
    checkUserRole(user);
  } catch (error) {
    alert(`Login failed: ${error.message}`);
  }
}

async function handleRegister() {
  const email = document.getElementById('newEmail').value;
  const password = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }

  try {
    const { user } = await auth.createUserWithEmailAndPassword(email, password);
    await usersRef.doc(user.uid).set({
      email,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    updateUIForAuthState(AUTH_STATES.PENDING_APPROVAL);
  } catch (error) {
    alert(`Registration failed: ${error.message}`);
  }
}

async function checkUserRole(user) {
  try {
    const doc = await usersRef.doc(user.uid).get();
    
    if (!doc.exists) {
      await usersRef.doc(user.uid).set({
        email: user.email,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return updateUIForAuthState(AUTH_STATES.PENDING_APPROVAL);
    }

    const userData = doc.data();
    const state = userData.role === 'admin' ? AUTH_STATES.ADMIN :
      userData.status === 'approved' ? AUTH_STATES.APPROVED :
      AUTH_STATES.PENDING_APPROVAL;
      
    updateUIForAuthState(state);
    if (state === AUTH_STATES.ADMIN) loadPendingUsers();
  } catch (error) {
    console.error('Role check error:', error);
  }
}

// UI Functions
function toggleForms() {
  const login = document.getElementById('loginSection');
  const register = document.getElementById('registerSection');
  login.style.display = login.style.display === 'none' ? 'block' : 'none';
  register.style.display = register.style.display === 'none' ? 'block' : 'none';
}

function updateUIForAuthState(state) {
  document.querySelectorAll('.auth-section').forEach(section => {
    section.style.display = 'none';
  });
  const sectionEl = document.getElementById(`${state}Section`);
  if (sectionEl)sectionEl.style.display = 'block';
}

// Admin Functions
async function loadPendingUsers() {
  try {
    const snapshot = await usersRef.where('status', '==', 'pending').get();
    const container = document.getElementById('pendingRequestsList');
    container.innerHTML = snapshot.docs.map(doc => {
      const data = doc.data();
      const date = data.createdAt?.toDate() || new Date();
      return `
        <div class="request-item">
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Requested:</strong> ${date.toLocaleString()}</p>
          <div class="request-actions">
            <button class="approve-btn" data-userid="${doc.id}">Approve</button>
            <button class="deny-btn" data-userid="${doc.id}">Deny</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Load pending error:', error);
  }
}

async function approveUser(userId) {
  try {
    const doc = await usersRef.doc(userId).get();
    await usersRef.doc(userId).update({
      status: 'approved',
      approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    sendEmailNotification(doc.data().email, 'approved');
    loadPendingUsers();
  } catch (error) {
    alert(`Approval failed: ${error.message}`);
  }
}

async function denyUser(userId) {
  try {
    const doc = await usersRef.doc(userId).get();
    await usersRef.doc(userId).update({
      status: 'denied',
      deniedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    sendEmailNotification(doc.data().email, 'denied');
    loadPendingUsers();
  } catch (error) {
    alert(`Denial failed: ${error.message}`);
  }
}

// Utilities
function sendEmailNotification(email, action) {
  fetch(EMAIL_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, action })
  }).catch(console.error);
}

function checkLoginStatus() {
  auth.onAuthStateChanged(user => {
    user ? checkUserRole(user) : updateUIForAuthState(AUTH_STATES.NOT_LOGGED_IN);
  });
}
*/
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function getData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error reading data file:', err);
    return { skills: [], requests: [], profile: {}, users: [], connections: [], systemLogs: [] };
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing data file:', err);
  }
}

function addSystemLog(data, type, message, studentName = null) {
  if (!data.systemLogs) data.systemLogs = [];
  data.systemLogs.unshift({
    id: Date.now() + Math.floor(Math.random() * 100),
    type,
    studentName: studentName || 'System',
    message,
    timestamp: new Date().toLocaleString()
  });
  if (data.systemLogs.length > 100) {
    data.systemLogs = data.systemLogs.slice(0, 100);
  }
}

// ----------------------------------------------------
// Public & Student Endpoints
// ----------------------------------------------------

// System Announcement
app.get('/api/announcement', (req, res) => {
  const data = getData();
  res.json(data.announcement || { text: '', active: false });
});

// Platform Statistics
app.get('/api/stats', (req, res) => {
  const data = getData();
  const students = new Set([
    ...(data.skills || []).map(s => s.studentName?.toLowerCase()),
    ...(data.requests || []).map(r => r.studentName?.toLowerCase()),
    ...(data.users || []).map(u => u.name?.toLowerCase()),
    data.profile?.name?.toLowerCase()
  ].filter(Boolean));

  let totalVideos = 0;
  let totalDoubts = 0;
  (data.skills || []).forEach(s => {
    if (s.videoUrl) totalVideos++;
    if (s.doubts) totalDoubts += s.doubts.length;
  });

  res.json({
    skillsAvailable: (data.skills || []).length,
    skillsRequests: (data.requests || []).length,
    students: students.size,
    connectionsCount: (data.connections || []).length,
    videosUploaded: totalVideos,
    doubtsAsked: totalDoubts
  });
});

// List Skills (with search, category, level filters)
app.get('/api/skills', (req, res) => {
  const { category, level, search } = req.query;
  let skills = getData().skills || [];

  if (category && category !== 'All Categories' && category !== 'all') {
    skills = skills.filter(s => s.category?.toLowerCase() === category.toLowerCase());
  }
  if (level && level !== 'All Levels' && level !== 'all') {
    skills = skills.filter(s => s.level?.toLowerCase() === level.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    skills = skills.filter(s =>
      (s.skillName && s.skillName.toLowerCase().includes(q)) ||
      (s.studentName && s.studentName.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q))
    );
  }
  res.json(skills);
});

// Get Single Skill Details (including video lessons, syllabus, and chat doubts)
app.get('/api/skills/:id', (req, res) => {
  const skillId = Number(req.params.id);
  const data = getData();
  const skill = (data.skills || []).find(s => s.id === skillId);
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found' });
  }
  res.json(skill);
});

// Increment video views when watched & log activity
app.post('/api/skills/:id/view', (req, res) => {
  const skillId = Number(req.params.id);
  const { studentName } = req.body || {};
  const data = getData();
  const skill = (data.skills || []).find(s => s.id === skillId);
  if (skill) {
    skill.viewsCount = (skill.viewsCount || 0) + 1;
    addSystemLog(data, 'video_view', `${studentName || 'Student'} watched video lesson for "${skill.skillName}"`, studentName);
    saveData(data);
    return res.json({ success: true, viewsCount: skill.viewsCount });
  }
  res.status(404).json({ error: 'Skill not found' });
});

// Live Chat / Doubt Message to Video Provider Student
app.post('/api/skills/:id/chat', (req, res) => {
  const skillId = Number(req.params.id);
  const { senderName, message } = req.body;

  if (!senderName || !message || !message.trim()) {
    return res.status(400).json({ error: 'Sender name and message are required.' });
  }

  const data = getData();
  const skill = (data.skills || []).find(s => s.id === skillId);
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found.' });
  }

  if (!skill.doubts) skill.doubts = [];

  const initials = senderName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 2) || 'ST';

  const newChatDoubt = {
    id: Date.now(),
    studentName: senderName.trim(),
    studentAvatar: initials,
    question: message.trim(),
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'pending',
    replies: []
  };

  // If the sender is asking the mentor, generate an instant simulated helpful acknowledgement if testing
  const isFromMentor = senderName.toLowerCase() === skill.studentName.toLowerCase();
  if (!isFromMentor) {
    // Automatically prepare mentor feedback after a short delay or reply immediately
    const mentorReply = {
      id: Date.now() + 1,
      authorName: `${skill.studentName} (Mentor)`,
      isMentor: true,
      text: `Thanks for asking! I'm reviewing your question on "${skill.skillName}". Feel free to also send me a 1-on-1 mentorship request if you want a detailed review!`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    newChatDoubt.replies.push(mentorReply);
    newChatDoubt.status = 'answered';
  }

  skill.doubts.push(newChatDoubt);
  addSystemLog(data, 'doubt', `${senderName} asked a question to ${skill.studentName} on "${skill.skillName}"`, senderName);
  saveData(data);

  res.status(201).json(newChatDoubt);
});

// Post a Doubt / Question on a Skill Lesson
app.post('/api/skills/:id/doubts', (req, res) => {
  const skillId = Number(req.params.id);
  const { studentName, question } = req.body;

  if (!studentName || !question || !question.trim()) {
    return res.status(400).json({ error: 'Student name and doubt question are required.' });
  }

  const data = getData();
  const skill = (data.skills || []).find(s => s.id === skillId);
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found.' });
  }

  if (!skill.doubts) skill.doubts = [];

  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 2) || 'ST';

  const newDoubt = {
    id: Date.now(),
    studentName: studentName.trim(),
    studentAvatar: initials,
    question: question.trim(),
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    status: 'pending',
    replies: []
  };

  skill.doubts.unshift(newDoubt);
  addSystemLog(data, 'doubt', `${studentName} asked a doubt on "${skill.skillName}": "${question.slice(0, 45)}..."`, studentName);
  saveData(data);

  res.status(201).json(newDoubt);
});

// Post an Answer / Reply to a Lesson Doubt
app.post('/api/skills/:id/doubts/:doubtId/replies', (req, res) => {
  const skillId = Number(req.params.id);
  const doubtId = Number(req.params.doubtId);
  const { authorName, text } = req.body;

  if (!authorName || !text || !text.trim()) {
    return res.status(400).json({ error: 'Author name and reply text are required.' });
  }

  const data = getData();
  const skill = (data.skills || []).find(s => s.id === skillId);
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found.' });
  }

  const doubt = (skill.doubts || []).find(d => d.id === doubtId);
  if (!doubt) {
    return res.status(404).json({ error: 'Doubt not found.' });
  }

  const isMentor = authorName.toLowerCase().includes(skill.studentName.toLowerCase()) || 
                   skill.studentName.toLowerCase().includes(authorName.toLowerCase());

  const newReply = {
    id: Date.now(),
    authorName: isMentor ? `${skill.studentName} (Mentor)` : authorName.trim(),
    isMentor,
    text: text.trim(),
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
  };

  if (!doubt.replies) doubt.replies = [];
  doubt.replies.push(newReply);
  doubt.status = 'answered';

  addSystemLog(data, 'reply', `${newReply.authorName} answered doubt on "${skill.skillName}"`, authorName);
  saveData(data);

  res.status(201).json(newReply);
});

// Create Skill with Video Format Support (Requires authenticated student identity)
app.post('/api/skills', (req, res) => {
  const { studentName, skillName, category, level, description, videoUrl, videoDuration, syllabus } = req.body;
  if (!studentName || !skillName) {
    return res.status(400).json({ error: 'Student name and skill name are required. Please log in first.' });
  }

  const data = getData();
  
  let syllabusList = [];
  if (Array.isArray(syllabus)) {
    syllabusList = syllabus;
  } else if (typeof syllabus === 'string' && syllabus.trim()) {
    syllabusList = syllabus.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  }
  if (!syllabusList.length) {
    syllabusList = [
      'Course Overview & Core Fundamentals',
      'Hands-on Practical Implementation',
      'Best Practices & Project Demo'
    ];
  }

  let formattedVideoUrl = (videoUrl || '').trim();
  if (formattedVideoUrl.includes('youtube.com/watch?v=')) {
    formattedVideoUrl = formattedVideoUrl.replace('watch?v=', 'embed/');
  } else if (formattedVideoUrl.includes('youtu.be/')) {
    formattedVideoUrl = formattedVideoUrl.replace('youtu.be/', 'www.youtube.com/embed/');
  }

  const newSkill = {
    id: Date.now(),
    studentName: studentName.trim(),
    skillName: skillName.trim(),
    category: category || 'Programming',
    level: level || 'Beginner',
    description: description ? description.trim() : 'Ready to help fellow students learn this skill with interactive video guidance!',
    videoUrl: formattedVideoUrl || 'https://www.youtube.com/embed/mU6anWqZJcc',
    videoDuration: videoDuration ? videoDuration.trim() : '20 mins',
    syllabus: syllabusList,
    viewsCount: 0,
    doubts: []
  };

  if (!data.skills) data.skills = [];
  data.skills.unshift(newSkill);

  if (data.users) {
    const user = data.users.find(u => u.name?.toLowerCase() === newSkill.studentName.toLowerCase());
    if (user) {
      user.skillsOffered = (user.skillsOffered || 0) + 1;
    }
  }

  addSystemLog(data, 'skill', `New skill "${newSkill.skillName}" published with video lesson by ${newSkill.studentName}`, newSkill.studentName);
  saveData(data);
  res.status(201).json(newSkill);
});

// Delete Skill (Owner or Admin)
app.delete('/api/skills/:id', (req, res) => {
  const skillId = Number(req.params.id);
  const { requester, role } = req.body || {};

  const data = getData();
  const index = (data.skills || []).findIndex(s => s.id === skillId);
  if (index === -1) {
    return res.status(404).json({ error: 'Skill not found' });
  }

  const skill = data.skills[index];
  if (role !== 'admin' && requester && requester.toLowerCase() !== skill.studentName.toLowerCase()) {
    return res.status(403).json({ error: 'Unauthorized to delete this skill.' });
  }

  data.skills.splice(index, 1);
  addSystemLog(data, 'skill_deleted', `Skill "${skill.skillName}" removed by ${requester || 'Admin'}`, requester);
  saveData(data);
  res.json({ success: true, message: 'Skill deleted successfully.' });
});

// List Requests
app.get('/api/requests', (req, res) => {
  const data = getData();
  res.json(data.requests || []);
});

// Create Request (Requires authenticated student identity)
app.post('/api/requests', (req, res) => {
  const { studentName, skillNeeded } = req.body;
  if (!studentName || !skillNeeded) {
    return res.status(400).json({ error: 'Student name and skill needed are required. Please log in first.' });
  }

  const data = getData();
  const newRequest = {
    id: Date.now(),
    studentName: studentName.trim(),
    skillNeeded: skillNeeded.trim(),
    createdAt: new Date().toISOString().split('T')[0]
  };

  if (!data.requests) data.requests = [];
  data.requests.unshift(newRequest);

  if (data.users) {
    const user = data.users.find(u => u.name?.toLowerCase() === newRequest.studentName.toLowerCase());
    if (user) {
      user.skillsLearning = (user.skillsLearning || 0) + 1;
    }
  }

  addSystemLog(data, 'request', `Learning request for "${newRequest.skillNeeded}" submitted by ${newRequest.studentName}`, newRequest.studentName);
  saveData(data);
  res.status(201).json(newRequest);
});

// Delete Request
app.delete('/api/requests/:id', (req, res) => {
  const reqId = Number(req.params.id);
  const { requester, role } = req.body || {};

  const data = getData();
  const index = (data.requests || []).findIndex(r => r.id === reqId);
  if (index === -1) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const targetReq = data.requests[index];
  if (role !== 'admin' && requester && requester.toLowerCase() !== targetReq.studentName.toLowerCase()) {
    return res.status(403).json({ error: 'Unauthorized to delete this request.' });
  }

  data.requests.splice(index, 1);
  addSystemLog(data, 'request_deleted', `Request for "${targetReq.skillNeeded}" removed by ${requester || 'Admin'}`, requester);
  saveData(data);
  res.json({ success: true, message: 'Request removed successfully.' });
});

// Direct Skill Connection Inquiries
app.get('/api/connections', (req, res) => {
  const { studentName, role } = req.query;
  const data = getData();
  const connections = data.connections || [];

  if (role === 'admin') {
    return res.json(connections);
  }

  if (studentName) {
    const name = studentName.toLowerCase();
    const filtered = connections.filter(c => 
      c.studentName?.toLowerCase() === name || 
      c.mentorName?.toLowerCase() === name
    );
    return res.json(filtered);
  }

  res.json(connections);
});

app.post('/api/connections', (req, res) => {
  const { skillId, skillName, mentorName, studentName, studentEmail, message, contactPreference } = req.body;
  if (!studentName || !mentorName || !skillName) {
    return res.status(400).json({ error: 'Missing required connection details.' });
  }

  const data = getData();
  const newConnection = {
    id: Date.now(),
    skillId: skillId || null,
    skillName: skillName.trim(),
    mentorName: mentorName.trim(),
    studentName: studentName.trim(),
    studentEmail: studentEmail || `${studentName.toLowerCase().replace(/\s+/g, '')}@campus.edu`,
    message: message ? message.trim() : `Hello ${mentorName}, I would like to learn ${skillName} with you!`,
    contactPreference: contactPreference || 'Email',
    status: 'pending',
    createdAt: new Date().toISOString().split('T')[0]
  };

  if (!data.connections) data.connections = [];
  data.connections.unshift(newConnection);

  addSystemLog(data, 'connect', `${studentName} sent a mentorship connection request to ${mentorName} for "${skillName}"`, studentName);
  saveData(data);
  res.status(201).json(newConnection);
});

app.patch('/api/connections/:id', (req, res) => {
  const connId = Number(req.params.id);
  const { status } = req.body;
  const data = getData();
  const conn = (data.connections || []).find(c => c.id === connId);
  if (!conn) {
    return res.status(404).json({ error: 'Connection request not found.' });
  }

  conn.status = status || conn.status;
  saveData(data);
  res.json({ success: true, connection: conn });
});

// ----------------------------------------------------
// Authentication Endpoints
// ----------------------------------------------------

// Unified Login (handles both student and admin)
app.post('/api/login', (req, res) => {
  const { usernameOrEmail, password, portalType } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Username or email and password are required.' });
  }

  const data = getData();
  const users = data.users || [];
  const q = usernameOrEmail.trim().toLowerCase();

  const user = users.find(u =>
    (u.name?.toLowerCase() === q || 
     (u.email && u.email.toLowerCase() === q) ||
     (u.role === 'admin' && (q === 'admin' || q === 'administrator'))) &&
    u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your login info.' });
  }

  if (portalType === 'admin' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  const userSkills = (data.skills || []).filter(s => s.studentName?.toLowerCase() === user.name?.toLowerCase());
  const userRequests = (data.requests || []).filter(r => r.studentName?.toLowerCase() === user.name?.toLowerCase());
  const userConnections = (data.connections || []).filter(c =>
    c.studentName?.toLowerCase() === user.name?.toLowerCase() ||
    c.mentorName?.toLowerCase() === user.name?.toLowerCase()
  );

  addSystemLog(data, 'auth', `${user.name} signed into the ${user.role === 'admin' ? 'Admin Portal' : 'Student Portal'}`, user.name);
  saveData(data);

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email || `${user.name.toLowerCase()}@campus.edu`,
      role: user.role || 'student',
      about: user.about || 'Student enthusiast eager to learn and share knowledge with peers on campus.',
      major: user.major || 'Computer Science & Engineering',
      year: user.year || '2nd Year (Sophomore)',
      skillsMastered: user.skillsMastered || ['Web Development', 'Problem Solving'],
      skillsLearningList: user.skillsLearningList || ['Advanced Frameworks'],
      github: user.github || '',
      linkedin: user.linkedin || '',
      skillsOffered: Math.max(user.skillsOffered || 0, userSkills.length),
      skillsLearning: Math.max(user.skillsLearning || 0, userRequests.length),
      mySkills: userSkills,
      myRequests: userRequests,
      myConnections: userConnections
    }
  });
});

// Student Registration
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are all required.' });
  }

  const data = getData();
  if (!data.users) data.users = [];

  const existing = data.users.find(u =>
    u.name?.toLowerCase() === name.trim().toLowerCase() ||
    u.email?.toLowerCase() === email.trim().toLowerCase()
  );

  if (existing) {
    return res.status(400).json({ error: 'An account with this name or student email already exists.' });
  }

  const newUser = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password,
    role: 'student',
    about: 'Student learner passionate about exploring skills and building projects.',
    major: 'Computer Science',
    year: '1st Year',
    skillsMastered: [],
    skillsLearningList: [],
    skillsOffered: 0,
    skillsLearning: 0,
    joinedAt: new Date().toISOString().split('T')[0]
  };

  data.users.push(newUser);
  addSystemLog(data, 'auth', `New student account created: ${newUser.name} (${newUser.email})`, newUser.name);
  saveData(data);

  res.status(201).json({
    success: true,
    user: {
      ...newUser,
      mySkills: [],
      myRequests: [],
      myConnections: []
    }
  });
});

// User Profile Details & About Profile
app.get('/api/profile', (req, res) => {
  const data = getData();
  const { username, email } = req.query;
  const users = data.users || [];
  let user = null;

  if (username || email) {
    const target = (username || email).toLowerCase();
    user = users.find(u => u.name?.toLowerCase() === target || (u.email && u.email.toLowerCase() === target));
  }

  if (!user && users.length > 0) {
    user = users[0];
  }

  if (!user) {
    return res.json({ name: 'Guest Student', role: 'student', about: '', skillsOffered: 0, skillsLearning: 0, mySkills: [], myRequests: [], myConnections: [] });
  }

  const userSkills = (data.skills || []).filter(s => s.studentName?.toLowerCase() === user.name?.toLowerCase());
  const userRequests = (data.requests || []).filter(r => r.studentName?.toLowerCase() === user.name?.toLowerCase());
  const userConnections = (data.connections || []).filter(c =>
    c.studentName?.toLowerCase() === user.name?.toLowerCase() ||
    c.mentorName?.toLowerCase() === user.name?.toLowerCase()
  );

  res.json({
    id: user.id,
    name: user.name,
    email: user.email || `${user.name.toLowerCase()}@campus.edu`,
    role: user.role || 'student',
    about: user.about || 'Student enthusiast eager to learn and share knowledge with peers on campus.',
    major: user.major || 'Computer Science & Engineering',
    year: user.year || '2nd Year (Sophomore)',
    skillsMastered: user.skillsMastered || ['Web Development', 'Problem Solving'],
    skillsLearningList: user.skillsLearningList || ['Modern Frameworks'],
    github: user.github || '',
    linkedin: user.linkedin || '',
    skillsOffered: Math.max(user.skillsOffered || 0, userSkills.length),
    skillsLearning: Math.max(user.skillsLearning || 0, userRequests.length),
    mySkills: userSkills,
    myRequests: userRequests,
    myConnections: userConnections
  });
});

// Update Student About Profile
app.put('/api/profile', (req, res) => {
  const { username, about, major, year, skillsMastered, skillsLearningList, github, linkedin } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  const data = getData();
  const user = (data.users || []).find(u => u.name?.toLowerCase() === username.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (about !== undefined) user.about = about.trim();
  if (major !== undefined) user.major = major.trim();
  if (year !== undefined) user.year = year.trim();
  if (skillsMastered !== undefined) {
    user.skillsMastered = Array.isArray(skillsMastered) ? skillsMastered : skillsMastered.split(/[,]+/).map(s => s.trim()).filter(Boolean);
  }
  if (skillsLearningList !== undefined) {
    user.skillsLearningList = Array.isArray(skillsLearningList) ? skillsLearningList : skillsLearningList.split(/[,]+/).map(s => s.trim()).filter(Boolean);
  }
  if (github !== undefined) user.github = github.trim();
  if (linkedin !== undefined) user.linkedin = linkedin.trim();

  addSystemLog(data, 'profile_update', `${user.name} updated their About Profile bio and information`, user.name);
  saveData(data);

  res.json({ success: true, user });
});

// Student Activities Portal Endpoint
app.get('/api/activities', (req, res) => {
  const { username } = req.query;
  const data = getData();
  const logs = data.systemLogs || [];

  if (username) {
    const q = username.toLowerCase();
    const userLogs = logs.filter(l => 
      (l.studentName && l.studentName.toLowerCase() === q) ||
      (l.message && l.message.toLowerCase().includes(q))
    );
    return res.json(userLogs);
  }

  res.json(logs);
});

// ----------------------------------------------------
// Dedicated Admin Endpoints & Comprehensive Progress
// ----------------------------------------------------

// Admin Full Progress & Oversight Endpoint
app.get('/api/admin/progress', (req, res) => {
  const data = getData();
  const skills = data.skills || [];
  const requests = data.requests || [];
  const users = data.users || [];
  const connections = data.connections || [];

  let totalVideos = 0;
  let totalVideoViews = 0;
  let totalDoubts = 0;
  let answeredDoubts = 0;
  const allDoubtsList = [];

  const skillsProgressList = skills.map(s => {
    if (s.videoUrl) totalVideos++;
    totalVideoViews += (s.viewsCount || 0);

    const doubts = s.doubts || [];
    totalDoubts += doubts.length;

    let skillAnsweredCount = 0;
    doubts.forEach(d => {
      if (d.status === 'answered' || (d.replies && d.replies.length > 0)) {
        answeredDoubts++;
        skillAnsweredCount++;
      }
      allDoubtsList.push({
        ...d,
        skillId: s.id,
        skillName: s.skillName,
        mentorName: s.studentName
      });
    });

    return {
      id: s.id,
      skillName: s.skillName,
      mentorName: s.studentName,
      category: s.category,
      level: s.level,
      hasVideo: !!s.videoUrl,
      videoDuration: s.videoDuration || 'N/A',
      viewsCount: s.viewsCount || 0,
      doubtsCount: doubts.length,
      answeredCount: skillAnsweredCount
    };
  });

  res.json({
    summary: {
      totalUsers: users.length,
      totalSkills: skills.length,
      totalVideos,
      totalVideoViews,
      totalDoubts,
      answeredDoubts,
      pendingDoubts: totalDoubts - answeredDoubts,
      totalRequests: requests.length,
      totalConnections: connections.length
    },
    skillsProgress: skillsProgressList,
    allDoubts: allDoubtsList,
    recentAuditLogs: (data.systemLogs || []).slice(0, 30)
  });
});

// Admin Overview Analytics
app.get('/api/admin/overview', (req, res) => {
  const data = getData();
  const skills = data.skills || [];
  const requests = data.requests || [];
  const users = data.users || [];
  const connections = data.connections || [];

  const categoryCounts = {};
  skills.forEach(s => {
    const cat = s.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const levelCounts = { Beginner: 0, Intermediate: 0, Advanced: 0 };
  skills.forEach(s => {
    if (levelCounts[s.level] !== undefined) {
      levelCounts[s.level]++;
    } else {
      levelCounts.Beginner++;
    }
  });

  let totalVideos = 0;
  let totalDoubts = 0;
  skills.forEach(s => {
    if (s.videoUrl) totalVideos++;
    if (s.doubts) totalDoubts += s.doubts.length;
  });

  res.json({
    stats: {
      totalUsers: users.length,
      totalSkills: skills.length,
      totalRequests: requests.length,
      totalConnections: connections.length,
      totalVideos,
      totalDoubts
    },
    categoryBreakdown: categoryCounts,
    levelBreakdown: levelCounts,
    recentLogs: (data.systemLogs || []).slice(0, 25),
    announcement: data.announcement || { text: '', active: false }
  });
});

// Admin Users List
app.get('/api/admin/users', (req, res) => {
  const data = getData();
  const safeUsers = (data.users || []).map(u => {
    const userSkills = (data.skills || []).filter(s => s.studentName?.toLowerCase() === u.name?.toLowerCase());
    const userReqs = (data.requests || []).filter(r => r.studentName?.toLowerCase() === u.name?.toLowerCase());
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role || 'student',
      major: u.major || 'Computer Science',
      year: u.year || '2nd Year',
      joinedAt: u.joinedAt || '2026-11-01',
      skillsCount: userSkills.length,
      requestsCount: userReqs.length
    };
  });
  res.json(safeUsers);
});

// Admin Update User Role
app.patch('/api/admin/users/:id/role', (req, res) => {
  const userId = req.params.id;
  const { newRole } = req.body;
  if (!newRole || !['student', 'admin'].includes(newRole)) {
    return res.status(400).json({ error: 'Invalid role specified.' });
  }

  const data = getData();
  const user = (data.users || []).find(u => String(u.id) === String(userId));
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  user.role = newRole;
  addSystemLog(data, 'admin_action', `User "${user.name}" role updated to ${newRole}`);
  saveData(data);
  res.json({ success: true, message: `Role updated to ${newRole}` });
});

// Admin Delete User
app.delete('/api/admin/users/:id', (req, res) => {
  const userId = req.params.id;
  const data = getData();
  const index = (data.users || []).findIndex(u => String(u.id) === String(userId));
  if (index === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const user = data.users[index];
  if (user.role === 'admin' && data.users.filter(u => u.role === 'admin').length <= 1) {
    return res.status(400).json({ error: 'Cannot delete the only remaining administrator.' });
  }

  data.users.splice(index, 1);
  addSystemLog(data, 'admin_action', `User "${user.name}" deleted from platform`);
  saveData(data);
  res.json({ success: true, message: 'User deleted successfully.' });
});

// Admin Announcement Update
app.post('/api/admin/announcement', (req, res) => {
  const { text, active } = req.body;
  const data = getData();
  data.announcement = {
    text: text !== undefined ? text : (data.announcement?.text || ''),
    active: active !== undefined ? active : true
  };
  addSystemLog(data, 'announcement', `System broadcast announcement updated`);
  saveData(data);
  res.json({ success: true, announcement: data.announcement });
});

// Serve Isolated Admin Page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Skill Exchange server running at http://localhost:${PORT}`));
}

module.exports = app;

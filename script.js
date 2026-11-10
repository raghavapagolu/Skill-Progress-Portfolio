/* ==========================================================================
   Skill Progress Portfolio - Client Logic
   Strict Auth Gating • Video Classroom • Live Doubts Chat • Activities • About Profile
   ========================================================================== */

// --- Global State ---
let currentUser = null;
let cachedSkills = [];
let cachedRequests = [];
let currentClassroomSkill = null;
let activeCategoryFilter = 'All Categories';
let activeLevelFilter = 'All Levels';

// --- Toast Notification Manager ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(60px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- Session Persistence & Navigation State Sync ---
function initSession() {
  try {
    // One-time cleanup of legacy cached demo session so user starts as clean guest
    if (localStorage.getItem('legacyDemoCleared') !== 'v3') {
      localStorage.removeItem('skillExchangeUser');
      localStorage.removeItem('currentUser');
      localStorage.setItem('legacyDemoCleared', 'v3');
    }

    const stored = localStorage.getItem('skillExchangeUser');
    if (stored) {
      currentUser = JSON.parse(stored);
    } else {
      currentUser = null;
    }
  } catch (e) {
    currentUser = null;
  }
  updateNavAuthState();
}

function setCurrentUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem('skillExchangeUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('skillExchangeUser');
    localStorage.removeItem('currentUser');
  }
  updateNavAuthState();
}

function updateNavAuthState() {
  const loggedOutBox = document.getElementById('nav-auth-logged-out');
  const loggedInBox = document.getElementById('nav-auth-logged-in');
  const navUserAvatar = document.getElementById('nav-user-avatar');
  const navUserName = document.getElementById('nav-user-name');
  const navUserRole = document.getElementById('nav-user-role');
  const studentOnlyNavLinks = document.querySelectorAll('.nav-student-only');
  const heroGuestActions = document.getElementById('hero-guest-actions');
  const heroLoggedActions = document.getElementById('hero-logged-actions');

  if (currentUser) {
    // Logged In State
    if (loggedOutBox) loggedOutBox.classList.add('hidden');
    if (loggedInBox) loggedInBox.classList.remove('hidden');

    studentOnlyNavLinks.forEach(link => link.classList.remove('hidden'));

    if (heroGuestActions) heroGuestActions.classList.add('hidden');
    if (heroLoggedActions) heroLoggedActions.classList.remove('hidden');

    const initials = (currentUser.name || 'User')
      .split(' ')
      .filter(Boolean)
      .map(w => w[0].toUpperCase())
      .join('')
      .slice(0, 2);

    if (navUserAvatar) navUserAvatar.textContent = initials || 'ST';
    if (navUserName) navUserName.textContent = currentUser.name || 'Student';
    if (navUserRole) {
      navUserRole.textContent = currentUser.role === 'admin' ? 'Campus Admin' : 'Student Member';
      navUserRole.classList.toggle('admin', currentUser.role === 'admin');
    }

    const offerName = document.getElementById('offer-student-name');
    const reqName = document.getElementById('request-student-name');
    if (offerName) offerName.value = currentUser.name;
    if (reqName) reqName.value = currentUser.name;
  } else {
    // Logged Out State: ONLY Dashboard & Sign In visible
    if (loggedOutBox) loggedOutBox.classList.remove('hidden');
    if (loggedInBox) loggedInBox.classList.add('hidden');

    studentOnlyNavLinks.forEach(link => link.classList.add('hidden'));

    if (heroGuestActions) heroGuestActions.classList.remove('hidden');
    if (heroLoggedActions) heroLoggedActions.classList.add('hidden');

    // Return to dashboard if attempting to view a student-only tab while logged out
    const activeNav = document.querySelector('.nav-btn.active');
    if (activeNav && activeNav.dataset.tab !== 'dashboard') {
      switchTab('dashboard');
    }
  }
}

// --- Tab Switching Manager ---
const navButtons = document.querySelectorAll('.nav-btn');
const tabSections = document.querySelectorAll('.tab-content');

function switchTab(targetTab) {
  // Guard student-only tabs
  if (!currentUser && targetTab !== 'dashboard') {
    showToast('Please sign in to access this portal section!', 'info');
    openAuthModal('student');
    return;
  }

  navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === targetTab);
  });

  tabSections.forEach(section => {
    const isTarget = section.id === `section-${targetTab}`;
    section.classList.toggle('hidden', !isTarget);
  });

  if (targetTab === 'dashboard') {
    loadStats();
    loadDashboardSpotlights();
  } else if (targetTab === 'marketplace') {
    loadSkills();
  } else if (targetTab === 'offer') {
    const nameInput = document.getElementById('offer-student-name');
    if (nameInput && currentUser) nameInput.value = currentUser.name;
  } else if (targetTab === 'requests') {
    const nameInput = document.getElementById('request-student-name');
    if (nameInput && currentUser) nameInput.value = currentUser.name;
    loadRequests();
  } else if (targetTab === 'activities') {
    loadActivities();
  } else if (targetTab === 'profile') {
    loadProfileDetails();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab) switchTab(tab);
  });
});

const brandLogoBtn = document.getElementById('brand-logo-btn');
if (brandLogoBtn) brandLogoBtn.addEventListener('click', () => switchTab('dashboard'));

const heroSignInBtn = document.getElementById('btn-hero-signin');
if (heroSignInBtn) heroSignInBtn.addEventListener('click', () => openAuthModal('student'));

const heroExploreBtn = document.getElementById('btn-hero-explore');
if (heroExploreBtn) heroExploreBtn.addEventListener('click', () => switchTab('marketplace'));

const heroOfferBtn = document.getElementById('btn-hero-offer');
if (heroOfferBtn) heroOfferBtn.addEventListener('click', () => switchTab('offer'));

const heroRequestBtn = document.getElementById('btn-hero-request');
if (heroRequestBtn) heroRequestBtn.addEventListener('click', () => switchTab('requests'));

const refreshStatsBtn = document.getElementById('btn-refresh-stats');
if (refreshStatsBtn) refreshStatsBtn.addEventListener('click', () => {
  loadStats();
  showToast('Platform statistics refreshed!', 'success');
});

const seeAllSkillsBtn = document.getElementById('btn-see-all-skills');
if (seeAllSkillsBtn) seeAllSkillsBtn.addEventListener('click', () => switchTab('marketplace'));

const seeAllRequestsBtn = document.getElementById('btn-see-all-requests');
if (seeAllRequestsBtn) seeAllRequestsBtn.addEventListener('click', () => switchTab('requests'));

// ==========================================================================
// Stats & Announcements
// ==========================================================================

async function loadAnnouncement() {
  try {
    const res = await fetch('/api/announcement');
    const data = await res.json();
    const banner = document.getElementById('announcement-banner');
    const bannerText = document.getElementById('announcement-text');
    if (data && data.active && data.text) {
      if (bannerText) bannerText.textContent = data.text;
      if (banner) banner.classList.remove('hidden');
    } else {
      if (banner) banner.classList.add('hidden');
    }
  } catch (err) {
    console.error('Failed to load announcement:', err);
  }
}

const closeAnnouncementBtn = document.getElementById('btn-close-announcement');
if (closeAnnouncementBtn) {
  closeAnnouncementBtn.addEventListener('click', () => {
    const banner = document.getElementById('announcement-banner');
    if (banner) banner.classList.add('hidden');
  });
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();

    const statVideos = document.getElementById('stat-videos');
    const statDoubts = document.getElementById('stat-doubts');
    const statStudents = document.getElementById('stat-students');
    const statRequests = document.getElementById('stat-requests');

    if (statVideos) statVideos.textContent = data.videosUploaded || (data.skillsAvailable || 0);
    if (statDoubts) statDoubts.textContent = data.doubtsAsked || 0;
    if (statStudents) statStudents.textContent = data.students || 0;
    if (statRequests) statRequests.textContent = data.skillsRequests || 0;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// ==========================================================================
// Dashboard Spotlight & Category Filters
// ==========================================================================

async function loadDashboardSpotlights() {
  try {
    const [skillsRes, requestsRes] = await Promise.all([
      fetch('/api/skills'),
      fetch('/api/requests')
    ]);

    const skills = await skillsRes.json();
    const requests = await requestsRes.json();

    const spotlightContainer = document.getElementById('dashboard-spotlight-skills');
    if (spotlightContainer) {
      const topSkills = skills.slice(0, 3);
      if (!topSkills.length) {
        spotlightContainer.innerHTML = '<div class="empty-state-notice">No video lessons available yet.</div>';
      } else {
        spotlightContainer.innerHTML = topSkills.map(skill => renderSkillCardHtml(skill)).join('');
      }
    }

    const recentReqContainer = document.getElementById('dashboard-recent-requests');
    if (recentReqContainer) {
      const recentReqs = requests.slice(0, 4);
      if (!recentReqs.length) {
        recentReqContainer.innerHTML = '<div class="empty-state-notice">No open requests yet.</div>';
      } else {
        recentReqContainer.innerHTML = recentReqs.map(req => `
          <div style="background:var(--surface-alt); padding:12px 16px; border-radius:var(--radius-md); border:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:var(--text-main); font-size:14px;">${escapeHtml(req.skillNeeded)}</strong>
              <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">Requested by: ${escapeHtml(req.studentName)}</div>
            </div>
            <span style="font-size:11.5px; color:var(--text-muted); background:white; padding:4px 8px; border-radius:var(--radius-pill); border:1px solid var(--border-light);">${req.createdAt || 'Recent'}</span>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Spotlight load failed:', err);
  }
}

const dashboardCatPills = document.querySelectorAll('#dashboard-cat-pills .cat-pill-btn');
dashboardCatPills.forEach(pill => {
  pill.addEventListener('click', () => {
    dashboardCatPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const cat = pill.dataset.cat;
    activeCategoryFilter = cat === 'all' ? 'All Categories' : cat;

    const catSelect = document.getElementById('category-filter');
    if (catSelect) catSelect.value = activeCategoryFilter;

    switchTab('marketplace');
  });
});

// ==========================================================================
// Skill Marketplace & Video Catalog
// ==========================================================================

const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const levelFilter = document.getElementById('level-filter');
const skillsContainer = document.getElementById('skills-container');

async function loadSkills() {
  if (!skillsContainer) return;
  const search = encodeURIComponent((searchInput?.value || '').trim());
  const category = encodeURIComponent(categoryFilter?.value || 'All Categories');
  const level = encodeURIComponent(levelFilter?.value || 'All Levels');

  try {
    const res = await fetch(`/api/skills?search=${search}&category=${category}&level=${level}`);
    const skills = await res.json();
    cachedSkills = skills;

    if (!skills.length) {
      skillsContainer.innerHTML = `
        <div class="empty-state-notice" style="grid-column: 1 / -1; padding: 40px;">
          <i class="fa-solid fa-film" style="font-size: 32px; color: var(--text-muted); margin-bottom: 12px; display:block;"></i>
          <strong>No skills found matching your filters.</strong>
          <p style="margin-top: 6px; font-size: 13px;">Try adjusting your keywords, or upload your own video lesson!</p>
        </div>
      `;
      return;
    }

    skillsContainer.innerHTML = skills.map(skill => renderSkillCardHtml(skill)).join('');
  } catch (err) {
    console.error('Failed to load skills:', err);
    skillsContainer.innerHTML = '<div class="empty-state-notice" style="grid-column: 1 / -1;">Unable to connect to server.</div>';
  }
}

function renderSkillCardHtml(skill) {
  const initials = (skill.studentName || 'Student')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 2);

  const catClass = (skill.category || 'general').toLowerCase().replace(/\s+/g, '-');
  const levelClass = (skill.level || 'beginner').toLowerCase();
  const doubtsCount = (skill.doubts || []).length;
  const duration = skill.videoDuration || '20 mins';

  return `
    <div class="skill-card" data-id="${skill.id}">
      <div class="skill-card-top">
        <div class="mentor-profile-mini">
          <div class="mentor-avatar">${initials}</div>
          <div class="mentor-info">
            <h4>${escapeHtml(skill.studentName)}</h4>
            <span>Peer Instructor</span>
          </div>
        </div>
        <span class="badge-tag video-tag">
          <i class="fa-solid fa-play"></i> Video • ${escapeHtml(duration)}
        </span>
      </div>

      <div class="skill-card-badges">
        <span class="badge-tag ${catClass}">
          <i class="fa-solid fa-tag"></i> ${escapeHtml(skill.category || 'General')}
        </span>
        <span class="badge-level ${levelClass}">
          <i class="fa-solid fa-chart-simple"></i> ${escapeHtml(skill.level || 'Beginner')}
        </span>
        <span style="font-size:11.5px; color:var(--text-muted); display:inline-flex; align-items:center; gap:4px; margin-left:auto;">
          <i class="fa-solid fa-comments"></i> ${doubtsCount} doubts
        </span>
      </div>

      <h3 class="skill-title">${escapeHtml(skill.skillName)}</h3>
      <p class="skill-desc">${escapeHtml(skill.description || 'Hands-on video lessons and live doubt assistance available.')}</p>

      <div class="skill-card-footer" style="flex-direction: column; gap: 8px;">
        <button class="btn-open-classroom" onclick="handleOpenClassroom(${skill.id})">
          <i class="fa-solid fa-circle-play"></i>
          <span>${currentUser ? 'Watch Video & Chat Doubts' : 'Watch Video (Sign In for Access)'}</span>
        </button>

        <button class="btn-request-skill" onclick="handleSkillConnectClick(${skill.id}, '${escapeJsQuote(skill.skillName)}', '${escapeJsQuote(skill.studentName)}')">
          <i class="fa-solid fa-handshake"></i>
          <span>${currentUser ? 'Request 1-on-1 Mentorship' : 'Sign In to Request'}</span>
        </button>
      </div>
    </div>
  `;
}

if (searchInput) searchInput.addEventListener('input', debounce(loadSkills, 250));
if (categoryFilter) categoryFilter.addEventListener('change', loadSkills);
if (levelFilter) levelFilter.addEventListener('change', loadSkills);

window.handleSkillConnectClick = function(skillId, skillTitle, mentorName) {
  if (!currentUser) {
    showToast('Please sign in or register to connect with mentors and request skills!', 'info');
    openAuthModal('student');
    return;
  }

  if (currentUser.name.toLowerCase() === mentorName.toLowerCase()) {
    showToast("This is your own skill listing! You cannot request mentorship from yourself.", 'info');
    return;
  }

  openConnectModal(skillId, skillTitle, mentorName);
};

// ==========================================================================
// Video Classroom & Live Doubts Chat Messenger
// ==========================================================================

const modalClassroom = document.getElementById('modal-classroom');
const btnCloseClassroomModal = document.getElementById('btn-close-classroom-modal');
const classroomVideoFrame = document.getElementById('classroom-video-frame');
const classroomSkillTitle = document.getElementById('classroom-skill-title');
const classroomMentorName = document.getElementById('classroom-mentor-name');
const classroomVideoDuration = document.getElementById('classroom-video-duration');
const classroomCategoryBadge = document.getElementById('classroom-category-badge');
const classroomViewsCount = document.getElementById('classroom-views-count');
const classroomSkillDesc = document.getElementById('classroom-skill-desc');
const classroomSyllabusList = document.getElementById('classroom-syllabus-list');
const classroomChatScroll = document.getElementById('classroom-chat-scroll');
const chatMentorTitle = document.getElementById('chat-mentor-title');
const chatDoubtsCounter = document.getElementById('chat-doubts-counter');
const btnClassroomRequestMentor = document.getElementById('btn-classroom-request-mentor');
const formChatSend = document.getElementById('form-chat-send');
const inputChatMessage = document.getElementById('input-chat-message');

window.handleOpenClassroom = async function(skillId) {
  if (!currentUser) {
    showToast('Please sign in to access video lessons and live doubts chat!', 'info');
    openAuthModal('student');
    return;
  }

  try {
    const res = await fetch(`/api/skills/${skillId}`);
    if (!res.ok) {
      showToast('Skill details not found.', 'error');
      return;
    }
    const skill = await res.json();
    currentClassroomSkill = skill;

    // Increment views & record student activity
    fetch(`/api/skills/${skillId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName: currentUser.name })
    }).catch(() => {});

    // Populate Left Video Panel
    if (classroomSkillTitle) classroomSkillTitle.textContent = skill.skillName;
    if (classroomMentorName) classroomMentorName.textContent = `Uploaded by Peer Mentor: ${skill.studentName}`;
    if (classroomVideoDuration) classroomVideoDuration.innerHTML = `<i class="fa-regular fa-clock"></i> ${skill.videoDuration || '25 mins'}`;
    if (classroomCategoryBadge) classroomCategoryBadge.textContent = skill.category || 'General';
    if (classroomViewsCount) classroomViewsCount.textContent = (skill.viewsCount || 0) + 1;
    if (classroomSkillDesc) classroomSkillDesc.textContent = skill.description || '';

    // Set video iframe
    if (classroomVideoFrame) {
      let videoSrc = skill.videoUrl || 'https://www.youtube.com/embed/mU6anWqZJcc';
      if (videoSrc.includes('watch?v=')) {
        videoSrc = videoSrc.replace('watch?v=', 'embed/');
      }
      classroomVideoFrame.src = videoSrc;
    }

    // Populate Syllabus
    if (classroomSyllabusList) {
      const syllabus = skill.syllabus || [
        'Fundamental Concepts & Syntax',
        'Hands-on Practical Implementation',
        'Advanced Tips & Best Practices'
      ];
      classroomSyllabusList.innerHTML = syllabus.map((item, idx) => `
        <div class="syllabus-item-check">
          <i class="fa-solid fa-circle-check"></i>
          <span><strong>Lesson ${idx + 1}:</strong> ${escapeHtml(item)}</span>
        </div>
      `).join('');
    }

    if (btnClassroomRequestMentor) {
      btnClassroomRequestMentor.onclick = () => {
        closeClassroomModal();
        handleSkillConnectClick(skill.id, skill.skillName, skill.studentName);
      };
    }

    // Setup Right Chat Messenger Panel
    if (chatMentorTitle) chatMentorTitle.textContent = `Chat with ${skill.studentName} (Instructor)`;
    renderClassroomChat(skill.doubts || []);

    if (modalClassroom) modalClassroom.classList.remove('hidden');
  } catch (err) {
    showToast('Failed to open video classroom.', 'error');
  }
};

function renderClassroomChat(doubts) {
  if (!classroomChatScroll) return;

  if (chatDoubtsCounter) {
    chatDoubtsCounter.textContent = `${doubts.length} doubts`;
  }

  if (!doubts.length) {
    classroomChatScroll.innerHTML = `
      <div class="empty-state-notice" style="background:white; margin:auto; padding:24px;">
        <i class="fa-solid fa-comments" style="font-size:26px; color:var(--primary); margin-bottom:8px; display:block;"></i>
        <strong>Ask your first doubt to ${escapeHtml(currentClassroomSkill?.studentName || 'the mentor')}!</strong>
        <p style="font-size:12.5px; color:var(--text-secondary); margin-top:4px;">
          Type your question below while watching the video to clarify any concept.
        </p>
      </div>
    `;
    return;
  }

  classroomChatScroll.innerHTML = doubts.map(d => {
    const isSender = currentUser && d.studentName.toLowerCase() === currentUser.name.toLowerCase();

    return `
      <div class="chat-bubble-row ${isSender ? 'outgoing' : 'incoming'}">
        <div class="chat-bubble-author">
          <span>${isSender ? 'You' : escapeHtml(d.studentName)}</span>
        </div>
        <div class="chat-bubble-text">${escapeHtml(d.question)}</div>
        <div class="chat-bubble-time">${d.createdAt || ''}</div>

        <!-- Threaded Mentor Replies if any -->
        ${d.replies && d.replies.length ? d.replies.map(r => `
          <div class="chat-bubble-row incoming mentor-msg" style="margin-top:6px; max-width:100%;">
            <div class="chat-bubble-author" style="color:#7c3aed;">
              <i class="fa-solid fa-reply"></i> ${escapeHtml(r.authorName)}
            </div>
            <div class="chat-bubble-text">${escapeHtml(r.text)}</div>
            <div class="chat-bubble-time">${r.createdAt || ''}</div>
          </div>
        `).join('') : ''}
      </div>
    `;
  }).join('');

  // Auto scroll to latest message
  classroomChatScroll.scrollTop = classroomChatScroll.scrollHeight;
}

// Live Chat Message Submission
if (formChatSend) {
  formChatSend.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast('Please sign in to chat.', 'error');
      openAuthModal('student');
      return;
    }

    if (!currentClassroomSkill) return;

    const msg = inputChatMessage.value.trim();
    if (!msg) return;

    try {
      const res = await fetch(`/api/skills/${currentClassroomSkill.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderName: currentUser.name, message: msg })
      });

      if (res.ok) {
        inputChatMessage.value = '';
        showToast('Doubt sent to instructor!', 'success');

        // Refresh classroom chat
        const refreshRes = await fetch(`/api/skills/${currentClassroomSkill.id}`);
        const updated = await refreshRes.json();
        currentClassroomSkill = updated;
        renderClassroomChat(updated.doubts || []);
        loadStats();
      } else {
        showToast('Could not deliver chat message.', 'error');
      }
    } catch (err) {
      showToast('Network error sending message.', 'error');
    }
  });
}

function closeClassroomModal() {
  if (modalClassroom) modalClassroom.classList.add('hidden');
  if (classroomVideoFrame) classroomVideoFrame.src = '';
  currentClassroomSkill = null;
}

if (btnCloseClassroomModal) btnCloseClassroomModal.addEventListener('click', closeClassroomModal);

// ==========================================================================
// Offer Skills Submission (With Video Format)
// ==========================================================================

const btnPresetWebDev = document.getElementById('btn-preset-webdev');
if (btnPresetWebDev) {
  btnPresetWebDev.addEventListener('click', () => {
    document.getElementById('offer-skill-name').value = 'Modern HTML5 & Responsive CSS Layouts';
    document.getElementById('offer-category').value = 'Programming';
    document.getElementById('offer-level').value = 'Beginner';
    document.getElementById('offer-video-url').value = 'https://www.youtube.com/embed/mU6anWqZJcc';
    document.getElementById('offer-video-duration').value = '25 mins';
    document.getElementById('offer-syllabus').value = "1. Semantic HTML Elements\n2. Modern CSS Flexbox\n3. CSS Grid Layouts\n4. Responsive Media Queries";
    document.getElementById('offer-description').value = 'Learn to build clean, mobile-responsive websites from scratch! I will answer any layout doubts in the side chat.';
  });
}

const btnPresetFigma = document.getElementById('btn-preset-figma');
if (btnPresetFigma) {
  btnPresetFigma.addEventListener('click', () => {
    document.getElementById('offer-skill-name').value = 'Figma UI/UX Design & Prototyping Masterclass';
    document.getElementById('offer-category').value = 'Design';
    document.getElementById('offer-level').value = 'Intermediate';
    document.getElementById('offer-video-url').value = 'https://www.youtube.com/embed/c9Wg6Cb_YlU';
    document.getElementById('offer-video-duration').value = '35 mins';
    document.getElementById('offer-syllabus').value = "1. Frames & Auto-Layout Essentials\n2. Design Systems & Tokens\n3. Interactive Prototyping\n4. Developer Handoff";
    document.getElementById('offer-description').value = 'Master component auto-layout and smart-animate prototyping in Figma. Ask any component doubts in the discussion panel!';
  });
}

const btnPresetMern = document.getElementById('btn-preset-mern');
if (btnPresetMern) {
  btnPresetMern.addEventListener('click', () => {
    document.getElementById('offer-skill-name').value = 'Full-Stack React & Node.js REST API Architecture';
    document.getElementById('offer-category').value = 'Programming';
    document.getElementById('offer-level').value = 'Advanced';
    document.getElementById('offer-video-url').value = 'https://www.youtube.com/embed/7CqJlxBYj-M';
    document.getElementById('offer-video-duration').value = '40 mins';
    document.getElementById('offer-syllabus').value = "1. Express API Routing & Middleware\n2. MongoDB Database Modeling\n3. React Hooks & State\n4. JWT Authentication Flow";
    document.getElementById('offer-description').value = 'Complete architectural walkthrough of building production-ready MERN stack apps. Ask any backend or state management doubts!';
  });
}

const offerForm = document.getElementById('offer-skill-form');
if (offerForm) {
  offerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast('You must be signed in to publish a skill with video.', 'error');
      openAuthModal('student');
      return;
    }

    const payload = {
      studentName: currentUser.name,
      skillName: document.getElementById('offer-skill-name').value.trim(),
      category: document.getElementById('offer-category').value,
      level: document.getElementById('offer-level').value,
      description: document.getElementById('offer-description').value.trim(),
      videoUrl: document.getElementById('offer-video-url').value.trim(),
      videoDuration: document.getElementById('offer-video-duration').value.trim(),
      syllabus: document.getElementById('offer-syllabus').value.trim()
    };

    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`🎉 "${payload.skillName}" published with video lesson!`, 'success');
        offerForm.reset();
        document.getElementById('offer-student-name').value = currentUser.name;
        loadStats();
        switchTab('marketplace');
      } else {
        showToast(data.error || 'Failed to publish skill.', 'error');
      }
    } catch (err) {
      showToast('Network error while saving skill.', 'error');
    }
  });
}

// ==========================================================================
// Request Skills Submission & List
// ==========================================================================

const requestForm = document.getElementById('request-skill-form');
if (requestForm) {
  requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast('You must be signed in to post a learning request.', 'error');
      openAuthModal('student');
      return;
    }

    const payload = {
      studentName: currentUser.name,
      skillNeeded: document.getElementById('request-skill-name').value.trim()
    };

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`💡 Request for "${payload.skillNeeded}" published!`, 'success');
        requestForm.reset();
        document.getElementById('request-student-name').value = currentUser.name;
        loadRequests();
        loadStats();
      } else {
        showToast(data.error || 'Failed to create request.', 'error');
      }
    } catch (err) {
      showToast('Network error while submitting request.', 'error');
    }
  });
}

async function loadRequests() {
  const container = document.getElementById('requests-container');
  const countBadge = document.getElementById('requests-count-badge');
  if (!container) return;

  try {
    const res = await fetch('/api/requests');
    const requests = await res.json();
    cachedRequests = requests;

    if (countBadge) countBadge.textContent = `${requests.length} open requests`;

    if (!requests.length) {
      container.innerHTML = '<div class="empty-state-notice" style="grid-column: 1 / -1;">No open requests right now. Be the first to ask!</div>';
      return;
    }

    container.innerHTML = requests.map(req => `
      <div class="request-item-card">
        <div>
          <h4><i class="fa-solid fa-lightbulb" style="color:var(--warning); margin-right:6px;"></i> ${escapeHtml(req.skillNeeded)}</h4>
          <p style="font-size:13px; color:var(--text-secondary);">Student: <strong>${escapeHtml(req.studentName)}</strong></p>
        </div>
        <div class="request-meta">
          <span><i class="fa-regular fa-calendar"></i> ${req.createdAt || 'Recent'}</span>
          ${currentUser && currentUser.name.toLowerCase() !== req.studentName.toLowerCase()
            ? `<button class="btn-action-sm success" onclick="handleOfferToTeach('${escapeJsQuote(req.studentName)}', '${escapeJsQuote(req.skillNeeded)}')"><i class="fa-solid fa-check"></i> I Can Teach This</button>`
            : ''
          }
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load requests:', err);
  }
}

window.handleOfferToTeach = function(requesterName, skillNeeded) {
  if (!currentUser) {
    showToast('Please sign in first!', 'info');
    openAuthModal('student');
    return;
  }
  showToast(`Mentorship interest sent to ${requesterName} for ${skillNeeded}! Check your campus chat to coordinate.`, 'success');
};

// ==========================================================================
// Activities Portal (Tracking Student Progress)
// ==========================================================================

async function loadActivities() {
  if (!currentUser) return;

  try {
    const res = await fetch(`/api/activities?username=${encodeURIComponent(currentUser.name)}`);
    const logs = await res.json();

    const timelineContainer = document.getElementById('activities-timeline-container');
    const countTag = document.getElementById('activities-count-tag');

    // Count metric summaries
    let videoViewsCount = 0;
    let doubtsCount = 0;
    let skillsOfferedCount = 0;
    let requestsCount = 0;

    logs.forEach(l => {
      if (l.type === 'video_view') videoViewsCount++;
      if (l.type === 'doubt' || l.type === 'reply') doubtsCount++;
      if (l.type === 'skill') skillsOfferedCount++;
      if (l.type === 'request') requestsCount++;
    });

    document.getElementById('act-stat-videos').textContent = videoViewsCount;
    document.getElementById('act-stat-doubts').textContent = doubtsCount;
    document.getElementById('act-stat-offered').textContent = skillsOfferedCount;
    document.getElementById('act-stat-requests').textContent = requestsCount;

    if (countTag) countTag.textContent = `${logs.length} logged activities`;

    if (!logs.length) {
      timelineContainer.innerHTML = `
        <div class="empty-state-notice" style="padding:32px;">
          <i class="fa-solid fa-clock-rotate-left" style="font-size:28px; color:var(--text-muted); margin-bottom:8px; display:block;"></i>
          <strong>No recorded activities yet for your account.</strong>
          <p style="font-size:13px; color:var(--text-secondary); margin-top:4px;">
            Watch video lessons, ask doubts, publish skills, or create learning requests to build your campus progress timeline!
          </p>
        </div>
      `;
      return;
    }

    timelineContainer.innerHTML = logs.map(l => {
      let icon = 'fa-circle-dot';
      let iconBg = '#e2e8f0';
      let iconColor = '#475569';

      if (l.type === 'video_view') {
        icon = 'fa-video';
        iconBg = '#fee2e2';
        iconColor = '#ef4444';
      } else if (l.type === 'doubt' || l.type === 'reply') {
        icon = 'fa-comments';
        iconBg = '#e0e7ff';
        iconColor = '#4f46e5';
      } else if (l.type === 'skill') {
        icon = 'fa-graduation-cap';
        iconBg = '#f0fdf4';
        iconColor = '#10b981';
      } else if (l.type === 'request') {
        icon = 'fa-lightbulb';
        iconBg = '#fffbeb';
        iconColor = '#f59e0b';
      } else if (l.type === 'connect') {
        icon = 'fa-handshake';
        iconBg = '#fdf2f8';
        iconColor = '#ec4899';
      }

      return `
        <div class="activity-timeline-item">
          <div class="activity-dot-icon" style="background:${iconBg}; color:${iconColor};">
            <i class="fa-solid ${icon}"></i>
          </div>
          <div class="activity-timeline-content">
            <h4>${escapeHtml(l.message)}</h4>
            <span><i class="fa-regular fa-clock"></i> ${l.timestamp}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load activities:', err);
  }
}

const btnRefreshActivities = document.getElementById('btn-refresh-activities');
if (btnRefreshActivities) {
  btnRefreshActivities.addEventListener('click', () => {
    loadActivities();
    showToast('Activities updated!', 'success');
  });
}

// ==========================================================================
// About Profile & User Portfolio
// ==========================================================================

async function loadProfileDetails() {
  if (!currentUser) return;

  try {
    const res = await fetch(`/api/profile?username=${encodeURIComponent(currentUser.name)}`);
    const profile = await res.json();

    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const avatarEl = document.getElementById('profile-avatar');
    const offeredEl = document.getElementById('profile-offered-count');
    const skillsCountEl = document.getElementById('profile-skills-count');
    const learningEl = document.getElementById('profile-learning-count');
    const inquiriesEl = document.getElementById('profile-inquiries-count');
    const badgeDeptText = document.getElementById('badge-dept-text');
    const badgeYearText = document.getElementById('badge-year-text');

    if (nameEl) {
      nameEl.innerHTML = `${escapeHtml(profile.name || currentUser.name)} <i class="fa-solid fa-circle-check profile-verified-icon" title="Verified Campus Student"></i>`;
    }
    if (emailEl) emailEl.textContent = profile.email || `${(currentUser.name || 'student').toLowerCase()}@campus.edu`;
    if (offeredEl) offeredEl.textContent = profile.skillsOffered || 0;
    if (skillsCountEl) skillsCountEl.textContent = (profile.skillsMastered || []).length;
    if (learningEl) learningEl.textContent = profile.skillsLearning || 0;
    if (inquiriesEl) inquiriesEl.textContent = (profile.myConnections || []).length;
    if (badgeDeptText) badgeDeptText.textContent = profile.major || 'Computer Science';
    if (badgeYearText) badgeYearText.textContent = profile.year || '3rd Year';

    if (avatarEl) {
      const initials = (profile.name || currentUser.name || 'S')
        .split(' ')
        .filter(Boolean)
        .map(w => w[0].toUpperCase())
        .join('')
        .slice(0, 2);
      avatarEl.innerHTML = `${initials || 'ST'}<div class="profile-avatar-status-dot" title="Active Campus Peer"></div>`;
    }

    // Populate Editable About Profile Form
    const bioInput = document.getElementById('about-user-bio');
    const majorInput = document.getElementById('about-user-major');
    const yearInput = document.getElementById('about-user-year');
    const masteredInput = document.getElementById('about-user-mastered');
    const learningInput = document.getElementById('about-user-learning');
    const githubInput = document.getElementById('about-user-github');
    const linkedinInput = document.getElementById('about-user-linkedin');

    if (bioInput) bioInput.value = profile.about || '';
    if (majorInput) majorInput.value = profile.major || '';
    if (yearInput) yearInput.value = profile.year || '';
    if (masteredInput) masteredInput.value = (profile.skillsMastered || []).join(', ');
    if (learningInput) learningInput.value = (profile.skillsLearningList || []).join(', ');
    if (githubInput) githubInput.value = profile.github || '';
    if (linkedinInput) linkedinInput.value = profile.linkedin || '';

    // Render Preview Tags Chips
    renderProfileChips('chips-mastered-preview', profile.skillsMastered || [], '');
    renderProfileChips('chips-learning-preview', profile.skillsLearningList || [], 'learning');

    // Live update chips and badges as user edits inputs
    if (masteredInput) {
      masteredInput.oninput = () => {
        const tags = masteredInput.value.split(',').map(s => s.trim()).filter(Boolean);
        renderProfileChips('chips-mastered-preview', tags, '');
        if (skillsCountEl) skillsCountEl.textContent = tags.length;
      };
    }
    if (learningInput) {
      learningInput.oninput = () => {
        const tags = learningInput.value.split(',').map(s => s.trim()).filter(Boolean);
        renderProfileChips('chips-learning-preview', tags, 'learning');
      };
    }
    if (majorInput) {
      majorInput.oninput = () => {
        if (badgeDeptText) badgeDeptText.textContent = majorInput.value.trim() || 'Computer Science';
      };
    }
    if (yearInput) {
      yearInput.oninput = () => {
        if (badgeYearText) badgeYearText.textContent = yearInput.value.trim() || 'Student';
      };
    }

    // Render My Skills
    const mySkillsList = document.getElementById('profile-my-skills-list');
    if (mySkillsList) {
      if (!profile.mySkills || !profile.mySkills.length) {
        mySkillsList.innerHTML = '<div class="empty-state-notice">You haven\'t published any skills or videos yet.</div>';
      } else {
        mySkillsList.innerHTML = profile.mySkills.map(s => `
          <div class="user-item-pill">
            <div>
              <strong>${escapeHtml(s.skillName)}</strong>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                ${escapeHtml(s.category)} • ${escapeHtml(s.level)} • <i class="fa-solid fa-play"></i> ${s.videoDuration || 'Available'}
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn-action-sm" onclick="handleOpenClassroom(${s.id})"><i class="fa-solid fa-play"></i> Watch</button>
              <button class="btn-action-sm danger" onclick="handleDeleteSkill(${s.id}, '${escapeJsQuote(s.skillName)}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        `).join('');
      }
    }

    // Render My Requests
    const myReqsList = document.getElementById('profile-my-requests-list');
    if (myReqsList) {
      if (!profile.myRequests || !profile.myRequests.length) {
        myReqsList.innerHTML = '<div class="empty-state-notice">You haven\'t posted any learning requests yet.</div>';
      } else {
        myReqsList.innerHTML = profile.myRequests.map(r => `
          <div class="user-item-pill">
            <div>
              <strong>${escapeHtml(r.skillNeeded)}</strong>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Posted: ${r.createdAt || 'Recent'}</div>
            </div>
            <button class="btn-action-sm danger" onclick="handleDeleteRequest(${r.id}, '${escapeJsQuote(r.skillNeeded)}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        `).join('');
      }
    }

    // Render Direct Connections
    const myConnList = document.getElementById('profile-my-connections-list');
    if (myConnList) {
      if (!profile.myConnections || !profile.myConnections.length) {
        myConnList.innerHTML = '<div class="empty-state-notice">No mentorship connection inquiries yet.</div>';
      } else {
        myConnList.innerHTML = profile.myConnections.map(c => {
          const isSender = c.studentName?.toLowerCase() === currentUser.name?.toLowerCase();
          const peer = isSender ? `Mentor: ${c.mentorName}` : `Student: ${c.studentName} (${c.studentEmail})`;
          const statusClass = c.status === 'accepted' ? 'color:#10b981; font-weight:700;' : 'color:#f59e0b; font-weight:700;';

          return `
            <div class="user-item-pill" style="align-items: flex-start;">
              <div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <strong>${escapeHtml(c.skillName)}</strong>
                  <span style="font-size:11px; text-transform:uppercase; ${statusClass}">[${c.status}]</span>
                </div>
                <div style="font-size:12.5px; color:var(--text-secondary); margin-top:3px;">${escapeHtml(peer)}</div>
                <div style="font-size:12.5px; color:var(--text-main); margin-top:4px; font-style:italic;">"${escapeHtml(c.message)}"</div>
                <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">Preference: ${escapeHtml(c.contactPreference)} • Date: ${c.createdAt}</div>
              </div>
              ${!isSender && c.status === 'pending'
                ? `<button class="btn-action-sm success" onclick="handleUpdateConnectionStatus(${c.id}, 'accepted')"><i class="fa-solid fa-check"></i> Accept Request</button>`
                : ''
              }
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load profile details:', err);
  }
}

function renderProfileChips(containerId, tags, extraClass = '') {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!tags.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = tags.map(t => `
    <span class="tag-chip ${extraClass}"><i class="fa-solid fa-tag"></i> ${escapeHtml(t)}</span>
  `).join('');
}

// Save About Profile Form Handler
async function handleSaveAboutProfile() {
  if (!currentUser) return;

  const payload = {
    username: currentUser.name,
    about: (document.getElementById('about-user-bio')?.value || '').trim(),
    major: (document.getElementById('about-user-major')?.value || '').trim(),
    year: (document.getElementById('about-user-year')?.value || '').trim(),
    skillsMastered: document.getElementById('about-user-mastered')?.value || '',
    skillsLearningList: document.getElementById('about-user-learning')?.value || '',
    github: (document.getElementById('about-user-github')?.value || '').trim(),
    linkedin: (document.getElementById('about-user-linkedin')?.value || '').trim()
  };

  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Profile information updated successfully!', 'success');
      loadProfileDetails();
    } else {
      showToast('Failed to save profile.', 'error');
    }
  } catch (err) {
    showToast('Network error while saving profile.', 'error');
  }
}

const btnSaveAboutProfile = document.getElementById('btn-save-about-profile');
if (btnSaveAboutProfile) {
  btnSaveAboutProfile.addEventListener('click', handleSaveAboutProfile);
}

const btnSaveAboutProfileBottom = document.getElementById('btn-save-about-profile-bottom');
if (btnSaveAboutProfileBottom) {
  btnSaveAboutProfileBottom.addEventListener('click', handleSaveAboutProfile);
}

window.handleDeleteSkill = async function(skillId, skillTitle) {
  if (!confirm(`Are you sure you want to delete "${skillTitle}"?`)) return;

  try {
    const res = await fetch(`/api/skills/${skillId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: currentUser.name, role: currentUser.role })
    });

    if (res.ok) {
      showToast(`Skill "${skillTitle}" removed.`, 'info');
      loadProfileDetails();
      loadStats();
    }
  } catch (err) {
    showToast('Network error while deleting skill.', 'error');
  }
};

window.handleDeleteRequest = async function(reqId, skillNeeded) {
  if (!confirm(`Are you sure you want to delete your request for "${skillNeeded}"?`)) return;

  try {
    const res = await fetch(`/api/requests/${reqId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: currentUser.name, role: currentUser.role })
    });

    if (res.ok) {
      showToast(`Request for "${skillNeeded}" removed.`, 'info');
      loadProfileDetails();
      loadStats();
    }
  } catch (err) {
    showToast('Network error while deleting request.', 'error');
  }
};

window.handleUpdateConnectionStatus = async function(connId, newStatus) {
  try {
    const res = await fetch(`/api/connections/${connId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      showToast(`Mentorship request marked as ${newStatus}!`, 'success');
      loadProfileDetails();
    }
  } catch (err) {
    showToast('Failed to update status.', 'error');
  }
};

const profileAddSkillBtn = document.getElementById('btn-profile-add-skill');
if (profileAddSkillBtn) profileAddSkillBtn.addEventListener('click', () => switchTab('offer'));

const profileAddReqBtn = document.getElementById('btn-profile-add-request');
if (profileAddReqBtn) profileAddReqBtn.addEventListener('click', () => switchTab('requests'));

const profileSignoutBtn = document.getElementById('btn-profile-signout');
if (profileSignoutBtn) profileSignoutBtn.addEventListener('click', () => logoutUser());

// ==========================================================================
// Authentication Modal & Forms (Student & Admin)
// ==========================================================================

const modalAuth = document.getElementById('modal-auth');
const btnOpenAuthModal = document.getElementById('btn-open-auth-modal');
const btnCloseAuthModal = document.getElementById('btn-close-auth-modal');
const modalTabSignin = document.getElementById('modal-tab-signin');
const modalTabAdminSignin = document.getElementById('modal-tab-admin-signin');
const modalTabRegister = document.getElementById('modal-tab-register');
const modalSigninForm = document.getElementById('modal-signin-form');
const modalRegisterForm = document.getElementById('modal-register-form');
const authModalTitle = document.getElementById('auth-modal-title');
const signinPortalType = document.getElementById('signin-portal-type');
const labelSigninUser = document.getElementById('label-signin-user');
const btnModalSigninSubmit = document.getElementById('btn-modal-signin-submit');

function openAuthModal(mode = 'student') {
  if (!modalAuth) return;
  const u = document.getElementById('signin-username');
  const p = document.getElementById('signin-password');
  if (u) u.value = '';
  if (p) p.value = '';
  modalAuth.classList.remove('hidden');
  setAuthModalMode(mode);
}

function closeAuthModal() {
  if (modalAuth) modalAuth.classList.add('hidden');
}

function setAuthModalMode(mode) {
  if (mode === 'student') {
    modalTabSignin?.classList.add('active');
    modalTabAdminSignin?.classList.remove('active');
    modalTabRegister?.classList.remove('active');
    modalSigninForm?.classList.remove('hidden');
    modalRegisterForm?.classList.add('hidden');
    if (signinPortalType) signinPortalType.value = 'student';
    if (labelSigninUser) labelSigninUser.textContent = 'Student Username or Campus Email';
    if (btnModalSigninSubmit) btnModalSigninSubmit.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In as Student';
    if (authModalTitle) authModalTitle.innerHTML = '<i class="fa-solid fa-user-graduate" style="color:var(--primary);"></i> Student Portal Sign In';
  } else if (mode === 'admin') {
    modalTabSignin?.classList.remove('active');
    modalTabAdminSignin?.classList.add('active');
    modalTabRegister?.classList.remove('active');
    modalSigninForm?.classList.remove('hidden');
    modalRegisterForm?.classList.add('hidden');
    if (signinPortalType) signinPortalType.value = 'admin';
    if (labelSigninUser) labelSigninUser.textContent = 'Administrator Username or Email';
    if (btnModalSigninSubmit) btnModalSigninSubmit.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Sign In to Admin Console';
    if (authModalTitle) authModalTitle.innerHTML = '<i class="fa-solid fa-shield-halved" style="color:#f59e0b;"></i> Administrator Portal Sign In';
  } else {
    modalTabSignin?.classList.remove('active');
    modalTabAdminSignin?.classList.remove('active');
    modalTabRegister?.classList.add('active');
    modalSigninForm?.classList.add('hidden');
    modalRegisterForm?.classList.remove('hidden');
    if (authModalTitle) authModalTitle.innerHTML = '<i class="fa-solid fa-user-plus" style="color:var(--primary);"></i> Register New Student Account';
  }
}

if (btnOpenAuthModal) btnOpenAuthModal.addEventListener('click', () => openAuthModal('student'));
if (btnCloseAuthModal) btnCloseAuthModal.addEventListener('click', closeAuthModal);
if (modalTabSignin) modalTabSignin.addEventListener('click', () => setAuthModalMode('student'));
if (modalTabAdminSignin) modalTabAdminSignin.addEventListener('click', () => setAuthModalMode('admin'));
if (modalTabRegister) modalTabRegister.addEventListener('click', () => setAuthModalMode('register'));

// Sign In Form Submission
if (modalSigninForm) {
  modalSigninForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameOrEmail = document.getElementById('signin-username').value.trim();
    const password = document.getElementById('signin-password').value;
    const portalType = signinPortalType?.value || 'student';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password, portalType })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        closeAuthModal();

        if (data.user.role === 'admin' && portalType === 'admin') {
          showToast(`Welcome Administrator ${data.user.name}! Redirecting to Admin Console...`, 'success');
          setCurrentUser(data.user);
          setTimeout(() => {
            window.location.href = '/admin';
          }, 600);
          return;
        }

        setCurrentUser(data.user);
        showToast(`Welcome, ${data.user.name}! All student features unlocked.`, 'success');
        loadStats();
        switchTab('marketplace');
      } else {
        showToast(data.error || 'Invalid credentials.', 'error');
      }
    } catch (err) {
      showToast('Network error while signing in.', 'error');
    }
  });
}

// Register Form Submission
if (modalRegisterForm) {
  modalRegisterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        closeAuthModal();
        showToast(`Account created! Welcome, ${data.user.name}.`, 'success');
        loadStats();
        switchTab('marketplace');
      } else {
        showToast(data.error || 'Registration failed.', 'error');
      }
    } catch (err) {
      showToast('Network error during registration.', 'error');
    }
  });
}

const quickSignoutBtn = document.getElementById('btn-quick-signout');
if (quickSignoutBtn) {
  quickSignoutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    logoutUser();
  });
}

const navUserChip = document.getElementById('nav-user-chip');
if (navUserChip) {
  navUserChip.addEventListener('click', () => switchTab('profile'));
}

function logoutUser() {
  setCurrentUser(null);
  showToast('You have been signed out. Welcome to guest mode.', 'info');
  switchTab('dashboard');
}

// ==========================================================================
// Direct Connection Inquiry Modal
// ==========================================================================

const modalConnect = document.getElementById('modal-connect');
const btnCloseConnectModal = document.getElementById('btn-close-connect-modal');
const connectInquiryForm = document.getElementById('connect-inquiry-form');

function openConnectModal(skillId, skillTitle, mentorName) {
  if (!modalConnect) return;
  document.getElementById('connect-skill-id').value = skillId;
  document.getElementById('connect-skill-title').value = skillTitle;
  document.getElementById('connect-mentor-name').value = mentorName;
  document.getElementById('connect-message').value = `Hi ${mentorName}, I watched your video lesson on ${skillTitle} and would love 1-on-1 mentorship to guide my projects!`;
  modalConnect.classList.remove('hidden');
}

function closeConnectModal() {
  if (modalConnect) modalConnect.classList.add('hidden');
}

if (btnCloseConnectModal) btnCloseConnectModal.addEventListener('click', closeConnectModal);

if (connectInquiryForm) {
  connectInquiryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast('Please sign in first!', 'error');
      closeConnectModal();
      openAuthModal('student');
      return;
    }

    const payload = {
      skillId: document.getElementById('connect-skill-id').value,
      skillName: document.getElementById('connect-skill-title').value,
      mentorName: document.getElementById('connect-mentor-name').value,
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      contactPreference: document.getElementById('connect-contact-pref').value,
      message: document.getElementById('connect-message').value.trim()
    };

    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(`Mentorship inquiry sent to ${payload.mentorName}!`, 'success');
        closeConnectModal();
        loadStats();
      } else {
        showToast('Failed to send inquiry.', 'error');
      }
    } catch (err) {
      showToast('Network error while sending mentorship request.', 'error');
    }
  });
}

// Global Modal Backdrop Click Handler
window.addEventListener('click', (e) => {
  if (e.target === modalAuth) closeAuthModal();
  if (e.target === modalConnect) closeConnectModal();
  if (e.target === modalClassroom) closeClassroomModal();
});

// Utilities
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsQuote(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

document.addEventListener('DOMContentLoaded', () => {
  initSession();
  loadAnnouncement();
  loadStats();
  loadDashboardSpotlights();
});

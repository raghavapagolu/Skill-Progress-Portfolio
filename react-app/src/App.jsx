import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import SkillMarketplace from './components/SkillMarketplace.jsx';
import OfferSkillForm from './components/OfferSkillForm.jsx';
import RequestSkillForm from './components/RequestSkillForm.jsx';
import Profile from './components/Profile.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ skillsAvailable: 0, skillsRequests: 0, students: 0 });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'dashboard') fetchStats();
  };

  return (
    <div>
      <Header />
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
      <main>
        {activeTab === 'dashboard' && <Dashboard stats={stats} />}
        {activeTab === 'marketplace' && <SkillMarketplace />}
        {activeTab === 'offer' && <OfferSkillForm onSkillAdded={fetchStats} />}
        {activeTab === 'requests' && <RequestSkillForm onRequestAdded={fetchStats} />}
        {activeTab === 'profile' && <Profile />}
      </main>
    </div>
  );
}

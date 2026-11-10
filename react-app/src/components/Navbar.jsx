const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'marketplace', label: 'Skill Marketplace' },
  { id: 'offer', label: 'Offer Skills' },
  { id: 'requests', label: 'Request Skills' },
  { id: 'profile', label: 'Profile' }
];

export default function Navbar({ activeTab, onTabChange }) {
  return (
    <nav>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

import { useState, useEffect } from 'react';

export default function SkillMarketplace() {
  const [skills, setSkills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All Categories');

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    if (category !== 'All Categories') params.append('category', category);

    fetch(`/api/skills?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setSkills(data || []))
      .catch((err) => console.error(err));
  }, [searchTerm, category]);

  return (
    <section>
      <h2>Skill Marketplace</h2>

      <input
        className="search-box"
        type="text"
        placeholder="Search for skills or students..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <select
        className="category-select"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="All Categories">All Categories</option>
        <option value="Programming">Programming</option>
        <option value="Design">Design</option>
        <option value="Video Editing">Video Editing</option>
        <option value="Photography">Photography</option>
        <option value="Business">Business</option>
      </select>

      {skills.length === 0 ? (
        <p style={{ marginTop: '20px', color: '#666' }}>No skills found.</p>
      ) : (
        skills.map((skill) => (
          <div key={skill.id} className="skill-card">
            <h3>{skill.skillName}</h3>
            <p className="student-name">Student: {skill.studentName}</p>
            <span className="skill-level">Level: {skill.level}</span>
            <span className="skill-level" style={{ backgroundColor: '#e0e7ff', marginLeft: '8px' }}>
              {skill.category}
            </span>
            <p className="skill-description" style={{ marginTop: '10px' }}>
              {skill.description || 'No description provided.'}
            </p>
            <button
              className="request-button"
              onClick={() => alert(`Request sent to ${skill.studentName}!`)}
            >
              Request This Skill
            </button>
          </div>
        ))
      )}
    </section>
  );
}

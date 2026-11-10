import { useState } from 'react';

export default function OfferSkillForm({ onSkillAdded }) {
  const [formData, setFormData] = useState(() => {
    let studentName = '';
    try {
      const saved = localStorage.getItem('currentUser');
      if (saved) studentName = JSON.parse(saved).name || '';
    } catch (e) {}
    return {
      studentName,
      skillName: '',
      category: 'Programming',
      level: 'Beginner',
      description: ''
    };
  });
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setStatus('Skill successfully added!');
      setFormData({
        studentName: '',
        skillName: '',
        category: 'Programming',
        level: 'Beginner',
        description: ''
      });
      if (onSkillAdded) onSkillAdded();
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <section>
      <h2>Offer Your Skills</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="studentName"
          placeholder="Your Name"
          value={formData.studentName}
          onChange={handleChange}
          required
        />
        <input
          name="skillName"
          placeholder="Skill Name (e.g. JavaScript, Python)"
          value={formData.skillName}
          onChange={handleChange}
          required
        />
        <select
          name="category"
          className="category-select"
          style={{ width: '100%', marginLeft: 0 }}
          value={formData.category}
          onChange={handleChange}
        >
          <option value="Programming">Programming</option>
          <option value="Design">Design</option>
          <option value="Video Editing">Video Editing</option>
          <option value="Photography">Photography</option>
          <option value="Business">Business</option>
        </select>
        <select name="level" value={formData.level} onChange={handleChange}>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
        <textarea
          name="description"
          placeholder="Describe your skill..."
          value={formData.description}
          onChange={handleChange}
        />
        <button type="submit">Add Skill</button>
        {status && <p className="status-msg">{status}</p>}
      </form>
    </section>
  );
}

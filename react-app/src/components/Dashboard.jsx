export default function Dashboard({ stats }) {
  return (
    <section>
      <h2>Dashboard</h2>
      <div className="dashboard-cards">
        <div className="card">
          <h3>{stats.skillsAvailable || 0}</h3>
          <p>Skills Available</p>
        </div>
        <div className="card">
          <h3>{stats.skillsRequests || 0}</h3>
          <p>Skills Requests</p>
        </div>
        <div className="card">
          <h3>{stats.students || 0}</h3>
          <p>Students</p>
        </div>
      </div>
    </section>
  );
}

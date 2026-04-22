function SettingsPage({ session }) {
  const user = session?.user;

  return (
    <div className="page-grid">
      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Profile</p>
            <h3>Your account</h3>
          </div>
        </div>

        <div className="settings-list">
          <div className="settings-row">
            <span>Email</span>
            <strong>{user?.email}</strong>
          </div>
          <div className="settings-row">
            <span>User ID</span>
            <strong className="truncate-text">{user?.id}</strong>
          </div>
        </div>
      </section>

      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Preferences</p>
            <h3>Future settings area</h3>
          </div>
        </div>

        <div className="empty-state">
          You can later add theme switch, profile name, focus duration, and notification settings here.
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;

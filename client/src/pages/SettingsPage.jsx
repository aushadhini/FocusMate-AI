function SettingsPage({ session }) {
  const user = session?.user;
  const emailPrefix = user?.email?.split("@")[0] || "user";
  const name = `${emailPrefix.charAt(0).toUpperCase()}${emailPrefix.slice(1)}`;

  return (
    <div className="page-grid">
      <section className="hero-panel settings-hero">
        <div>
          <p className="eyebrow">Profile</p>
          <h3 className="hero-heading">Your FocusMate workspace</h3>
          <p className="hero-copy">
            This area is ready for future profile settings, theme controls, notification preferences, and focus duration customization.
          </p>
        </div>
        <div className="profile-preview">
          <div className="avatar-circle large">{name.charAt(0)}</div>
          <div>
            <strong>{name}</strong>
            <span>{user?.email}</span>
          </div>
        </div>
      </section>

      <section className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Account</p>
            <h3>Your details</h3>
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
            <h3>Coming next</h3>
          </div>
        </div>

        <div className="settings-feature-grid">
          <div className="feature-card">
            <span>🎨</span>
            <h4>Theme switch</h4>
            <p>Light and dark mode controls for your workspace.</p>
          </div>
          <div className="feature-card">
            <span>⏱️</span>
            <h4>Focus duration</h4>
            <p>Customize Pomodoro length and break timing.</p>
          </div>
          <div className="feature-card">
            <span>🔔</span>
            <h4>Notifications</h4>
            <p>Session reminders and completion alerts.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;

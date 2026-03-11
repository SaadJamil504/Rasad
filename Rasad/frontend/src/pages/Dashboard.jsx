import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="welcome-banner">
        <h1>Welcome to Rasad Dashboard! 👋</h1>
        <p>Here's what's happening today in your milk delivery network.</p>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Routes</div>
          <div className="stat-value">12</div>
          <div className="stat-change positive">+2 this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Customers</div>
          <div className="stat-value">148</div>
          <div className="stat-change positive">+12% vs last month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Deliveries</div>
          <div className="stat-value">3,420</div>
          <div className="stat-change">Updated just now</div>
        </div>
      </div>
      
      <div className="recent-activity">
        <h3>System Overview</h3>
        <div className="placeholder-content">
          <p>This dashboard is now integrated with the Django Backend.</p>
          <div className="badge-list">
            <span className="badge">JWT Auth Active</span>
            <span className="badge">CORS Configured</span>
            <span className="badge">React 19</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

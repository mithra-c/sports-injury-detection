import React, { useState, useEffect } from 'react';
import {
  getAdminStats,
  getAdminUsers,
  getAdminAnalyses,
  getAdminActivity,
  getAdminAnalyticsRiskDistribution,
  getAdminAnalysesOverTime,
  getAdminAnalyticsMovementMetrics,
  getAdminNotifications,
  markNotificationRead as apiMarkNotificationRead,
} from './apiService';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import './AdminDashboard.css';

const RISK_COLORS = {
  Low: '#16a34a',
  low: '#16a34a',
  Moderate: '#d97706',
  medium: '#d97706',
  High: '#dc2626',
  high: '#dc2626',
};

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [activity, setActivity] = useState(null);
  const [riskDistribution, setRiskDistribution] = useState(null);
  const [analysesOverTime, setAnalysesOverTime] = useState(null);
  const [movementMetrics, setMovementMetrics] = useState(null);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const [
        statsData,
        usersData,
        analysesData,
        activityData,
        riskData,
        overTimeData,
        metricsData,
        notifData,
      ] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminAnalyses(1, 20),
        getAdminActivity(),
        getAdminAnalyticsRiskDistribution(),
        getAdminAnalysesOverTime(),
        getAdminAnalyticsMovementMetrics(),
        getAdminNotifications(true),
      ]);

      setStats(statsData);
      setUsers(usersData.users || []);
      setAnalyses(analysesData.analyses || []);
      setActivity(activityData);
      setRiskDistribution(riskData);
      setAnalysesOverTime(overTimeData);
      setMovementMetrics(metricsData);
      setAdminNotifications(notifData.notifications || []);
    } catch (err) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminNotificationRead = async (id) => {
    try {
      await apiMarkNotificationRead(id);
      setAdminNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark admin notification as read:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const pieData = riskDistribution
    ? [
        { name: 'Low', value: riskDistribution.low, color: RISK_COLORS.Low },
        { name: 'Moderate', value: riskDistribution.medium, color: RISK_COLORS.Moderate },
        { name: 'High', value: riskDistribution.high, color: RISK_COLORS.High },
      ].filter((d) => d.value > 0)
    : [];

  const trendData = analysesOverTime && analysesOverTime.trend.length > 0
    ? analysesOverTime.trend.map((t) => ({
        date: formatShortDate(t.date),
        score: t.score,
        risk: t.risk_level,
      }))
    : [];

  const barData = movementMetrics && movementMetrics.metrics.length > 0
    ? movementMetrics.metrics.map((m) => ({
        name: m.name,
        value: Math.min(m.value, 100),
        unit: m.unit,
      }))
    : [];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p className="admin-subtitle">System overview and analytics</p>
      </div>

      <div className="admin-metrics">
        <div className="admin-metric-box">
          <span className="admin-metric-value">{stats?.total_users || 0}</span>
          <span className="admin-metric-label">Total Users</span>
        </div>
        <div className="admin-metric-box">
          <span className="admin-metric-value">{stats?.total_analyses || 0}</span>
          <span className="admin-metric-label">Total Analyses</span>
        </div>
        <div className="admin-metric-box admin-metric-low">
          <span className="admin-metric-value">{stats?.low_risk || 0}</span>
          <span className="admin-metric-label">Low Risk</span>
        </div>
        <div className="admin-metric-box admin-metric-medium">
          <span className="admin-metric-value">{stats?.medium_risk || 0}</span>
          <span className="admin-metric-label">Moderate Risk</span>
        </div>
        <div className="admin-metric-box admin-metric-high">
          <span className="admin-metric-value">{stats?.high_risk || 0}</span>
          <span className="admin-metric-label">High Risk</span>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          Analytics
        </button>
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          Users
        </button>
        <button className={`admin-tab ${activeTab === 'analyses' ? 'active' : ''}`} onClick={() => setActiveTab('analyses')}>
          Analyses
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="admin-grid">
          <div className="admin-card">
            <h3 className="card-title">Recent Users</h3>
            {activity?.recent_users && activity.recent_users.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.recent_users.map((user) => (
                    <tr key={user.id}>
                      <td className="cell-primary">{user.full_name}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td className="cell-muted">{formatDate(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state-small"><p>No users yet</p></div>
            )}
          </div>

          <div className="admin-card">
            <h3 className="card-title">Recent Analyses</h3>
            {activity?.recent_analyses && activity.recent_analyses.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Video</th>
                    <th>Risk Level</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.recent_analyses.map((analysis) => (
                    <tr key={analysis.id}>
                      <td className="cell-primary">{analysis.video_name}</td>
                      <td>
                        <span className={`risk-pill risk-${(analysis.risk_level || 'low').toLowerCase()}`}>
                          {analysis.risk_level || 'Low'}
                        </span>
                      </td>
                      <td>{analysis.movement_score ?? 'N/A'}</td>
                      <td className="cell-muted">{formatDate(analysis.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state-small"><p>No analyses yet</p></div>
            )}
          </div>

          {activity?.high_risk_alerts && activity.high_risk_alerts.length > 0 && (
            <div className="admin-card admin-card-full">
              <h3 className="card-title">High Risk Alerts</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Video</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.high_risk_alerts.map((analysis) => (
                    <tr key={analysis.id}>
                      <td className="cell-primary">{analysis.video_name}</td>
                      <td className="cell-danger">{analysis.movement_score ?? 'N/A'}</td>
                      <td className="cell-muted">{formatDate(analysis.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-card admin-card-full">
            <h3 className="card-title">System Notifications</h3>
            {adminNotifications.length > 0 ? (
              <div className="admin-notification-list">
                {adminNotifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`admin-notification-item ${!notification.is_read ? 'unread' : ''}`}
                    onClick={() => !notification.is_read && handleAdminNotificationRead(notification.id)}
                  >
                    <div className="admin-notification-content">
                      <div className="admin-notification-title">{notification.title}</div>
                      <div className="admin-notification-message">{notification.message}</div>
                      <div className="admin-notification-time">{formatDate(notification.created_at)}</div>
                    </div>
                    {!notification.is_read && <div className="unread-dot" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-small"><p>No system notifications yet</p></div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="admin-grid">
          <div className="admin-card">
            <h3 className="card-title">Risk Distribution</h3>
            <div className="chart-wrapper">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} analysis${value !== 1 ? 'es' : ''}`, 'Count']}
                      contentStyle={{
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => <span style={{ color: '#334155', fontSize: '12px' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart"><p>No data available</p></div>
              )}
            </div>
          </div>

          <div className="admin-card">
            <h3 className="card-title">Analyses Over Time</h3>
            <div className="chart-wrapper">
              {trendData.length > 1 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#2563eb' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart"><p>{trendData.length === 1 ? 'Need at least 2 analyses to show trend.' : 'No data available'}</p></div>
              )}
            </div>
          </div>

          <div className="admin-card admin-card-full">
            <h3 className="card-title">Movement Metrics Overview</h3>
            <div className="chart-wrapper">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                      formatter={(value, name, props) => [`${value} ${props.payload.unit}`, name]}
                    />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]} fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart"><p>No data available</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-card">
          <h3 className="card-title">User Management</h3>
          {users.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="cell-muted">#{user.id}</td>
                    <td className="cell-primary">{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <span className={`status-pill ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="cell-muted">{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state-small"><p>No users yet</p></div>
          )}
        </div>
      )}

      {activeTab === 'analyses' && (
        <div className="admin-card">
          <h3 className="card-title">All Analyses</h3>
          {analyses.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Video</th>
                  <th>Risk Level</th>
                  <th>Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((analysis) => (
                  <tr key={analysis.id}>
                    <td className="cell-muted">#{analysis.id}</td>
                    <td className="cell-primary">{analysis.video_name}</td>
                    <td>
                      <span className={`risk-pill risk-${(analysis.risk_level || 'low').toLowerCase()}`}>
                        {analysis.risk_level || 'Low'}
                      </span>
                    </td>
                    <td>{analysis.movement_score ?? 'N/A'}</td>
                    <td className="cell-muted">{formatDate(analysis.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state-small"><p>No analyses yet</p></div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
import React, { useState, useEffect } from 'react';
import {
  getAnalysisHistory,
  getNotifications,
  getCurrentUser,
  getDashboardSummary,
  getDashboardRiskDistribution,
  getDashboardMovementMetrics,
  getDashboardRiskTrend,
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
import './Dashboard.css';

const RISK_COLORS = {
  Low: '#16a34a',
  low: '#16a34a',
  Moderate: '#d97706',
  medium: '#d97706',
  High: '#dc2626',
  high: '#dc2626',
};

function Dashboard({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [riskDistribution, setRiskDistribution] = useState(null);
  const [movementMetrics, setMovementMetrics] = useState(null);
  const [riskTrend, setRiskTrend] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [
        summaryData,
        riskData,
        metricsData,
        trendData,
        historyData,
        notifData,
      ] = await Promise.all([
        getDashboardSummary(),
        getDashboardRiskDistribution(),
        getDashboardMovementMetrics(),
        getDashboardRiskTrend(),
        getAnalysisHistory({ page: 1, per_page: 5 }),
        getNotifications(true),
      ]);

      setSummary(summaryData);
      setRiskDistribution(riskData);
      setMovementMetrics(metricsData);
      setRiskTrend(trendData);
      setRecentAnalyses(historyData.analyses || []);
      setNotifications(notifData.notifications || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
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
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const hasAnalyses = summary && summary.total_analyses > 0;
  const pieData = riskDistribution
    ? [
        { name: 'Low', value: riskDistribution.low, color: RISK_COLORS.Low },
        { name: 'Moderate', value: riskDistribution.medium, color: RISK_COLORS.Moderate },
        { name: 'High', value: riskDistribution.high, color: RISK_COLORS.High },
      ].filter((d) => d.value > 0)
    : [];

  const barData = movementMetrics && movementMetrics.metrics.length > 0
    ? movementMetrics.metrics.map((m) => ({
        name: m.name,
        value: Math.min(m.value, 100),
        unit: m.unit,
      }))
    : [];

  const trendData = riskTrend && riskTrend.trend.length > 0
    ? riskTrend.trend.map((t) => ({
        date: formatShortDate(t.date),
        score: t.score,
        risk: t.risk_level,
      }))
    : [];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {getCurrentUser()?.full_name || 'User'}</h1>
          <p className="dashboard-subtitle">
            {summary?.recent_date
              ? `Latest analysis: ${formatDate(summary.recent_date)}`
              : 'No analyses yet. Upload a video to get started.'}
          </p>
        </div>
      </div>

      <div className="metrics-row">
        <div className="metric-box">
          <span className="metric-value">{summary?.total_analyses || 0}</span>
          <span className="metric-label">Total Analyses</span>
        </div>
        <div className="metric-box">
          <span className="metric-value">{summary?.average_score || 0}</span>
          <span className="metric-label">Average Risk Score</span>
        </div>
        <div className="metric-box metric-high">
          <span className="metric-value">{summary?.high_risk || 0}</span>
          <span className="metric-label">High Risk</span>
        </div>
        <div className="metric-box">
          <span className="metric-value">{formatDate(summary?.recent_date)}</span>
          <span className="metric-label">Last Analysis</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2 className="section-title">Risk Distribution</h2>
          <div className="chart-card">
            {hasAnalyses && pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
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
              <div className="empty-chart">
                <p>No analysis data available yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h2 className="section-title">Movement Metrics</h2>
          <div className="chart-card">
            {hasAnalyses && barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
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
              <div className="empty-chart">
                <p>No analysis data available yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section dashboard-section-full">
          <h2 className="section-title">Risk Score Trend</h2>
          <div className="chart-card">
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height={280}>
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
              <div className="empty-chart">
                <p>{trendData.length === 1 ? 'Need at least 2 analyses to show trend.' : 'No analysis data available yet.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-bottom">
        <div className="bottom-panel">
          <div className="panel-header">
            <h3>Recent Analyses</h3>
            <button className="panel-link" onClick={() => onNavigate('history')}>View all</button>
          </div>
          {recentAnalyses.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Video</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentAnalyses.map((analysis) => (
                  <tr key={analysis.id}>
                    <td className="cell-date">{formatDate(analysis.created_at)}</td>
                    <td className="cell-primary">{analysis.video_name}</td>
                    <td>
                      <span className={`score-pill score-${analysis.movement_score >= 70 ? 'danger' : analysis.movement_score >= 30 ? 'warning' : 'good'}`}>
                        {analysis.movement_score ?? 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-pill risk-${(analysis.risk_level || 'low').toLowerCase()}`}>
                        {analysis.risk_level || 'Low'}
                      </span>
                    </td>
                    <td>
                      <button className="link-button" onClick={() => onNavigate('history')}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state-small">
              <p>No analyses yet.</p>
            </div>
          )}
        </div>

        <div className="bottom-panel">
          <div className="panel-header">
            <h3>Recent Notifications</h3>
          </div>
          {notifications.length > 0 ? (
            <div className="notification-list">
              {notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className={`notification-row ${!notification.is_read ? 'unread' : ''}`}>
                  <div className="notification-row-content">
                    <div className="notification-row-title">{notification.title}</div>
                    <div className="notification-row-message">{notification.message}</div>
                    <div className="notification-row-time">{formatDate(notification.created_at)}</div>
                  </div>
                  {!notification.is_read && <div className="unread-indicator" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-small">
              <p>No notifications yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
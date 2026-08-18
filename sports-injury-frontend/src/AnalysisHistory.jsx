import React, { useState, useEffect, useCallback } from 'react';
import { getAnalysisHistory, getAnalysisById, deleteAnalysis, downloadReport, getAthleteProfile } from './apiService';
import './AnalysisHistory.css';

function AnalysisHistory() {
  const getRecommendations = (level) => {
    switch (level) {
      case 'low':
        return [
          'Continue proper warm-up routines before activity.',
          'Maintain good technique and movement quality during training.',
          'Monitor movement patterns regularly to ensure consistency.',
        ];
      case 'medium':
        return [
          'Consider technique correction for identified movement patterns.',
          'Ensure adequate recovery between training sessions.',
          'Consultation with a qualified sports professional is recommended if concerns persist.',
        ];
      case 'high':
        return [
          'Avoid relying solely on this automated assessment for injury prevention decisions.',
          'Consider evaluation by a qualified sports medicine professional before continuing high-risk activity.',
          'Focus on foundational strength and mobility work under professional guidance.',
        ];
      default:
        return [
          'Continue monitoring movement quality over time.',
          'Maintain consistent training and recovery habits.',
        ];
    }
  };

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {
        search: search || undefined,
        risk_level: riskFilter !== 'all' ? riskFilter : undefined,
        page,
        per_page: perPage,
      };
      const data = await getAnalysisHistory(filters);
      setAnalyses(data.analyses || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load analysis history');
    } finally {
      setLoading(false);
    }
  }, [search, riskFilter, page, perPage]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (e) => {
    setRiskFilter(e.target.value);
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this analysis?')) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteAnalysis(id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      setTotal((prev) => prev - 1);
      if (viewingId === id) {
        setViewingId(null);
        setViewData(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete analysis');
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = async (id) => {
    if (viewingId === id) {
      setViewingId(null);
      setViewData(null);
      return;
    }
    try {
      const [data, profile] = await Promise.all([
        getAnalysisById(id),
        getAthleteProfile(),
      ]);
      setViewData({ ...data, athlete_profile: profile });
      setViewingId(id);
    } catch (err) {
      setError(err.message || 'Failed to load analysis details');
    }
  };

  const handleDownload = async (id) => {
    setDownloadingId(id);
    try {
      await downloadReport(id);
    } catch (err) {
      setError(err.message || 'Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="analysis-history-container">
      <div className="history-header">
        <div className="history-header-row">
          <div>
            <h2>Analysis History</h2>
            <p>View, search, and manage your previous analyses</p>
          </div>
          <button onClick={fetchHistory} className="refresh-btn" disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="history-controls">
        <div className="search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by video name..."
            value={search}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <div className="filter-box">
          <select
            value={riskFilter}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analyses...</p>
        </div>
      ) : analyses.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
          <p>No analysis records found.</p>
          <p>Upload a video to get started.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Video Name</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((analysis) => (
                  <tr key={analysis.id}>
                    <td className="cell-muted">{formatDate(analysis.created_at)}</td>
                    <td className="cell-primary">{analysis.video_name}</td>
                    <td>
                      <span className={`score-pill score-${analysis.movement_score >= 70 ? 'danger' : analysis.movement_score >= 30 ? 'warning' : 'good'}`}>
                        {analysis.movement_score != null ? analysis.movement_score : 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-pill risk-${(analysis.risk_level || 'low').toLowerCase()}`}>
                        {analysis.risk_level || 'Low'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        onClick={() => handleView(analysis.id)}
                        className={`btn-view ${viewingId === analysis.id ? 'btn-active' : ''}`}
                        title="View Details"
                      >
                        {viewingId === analysis.id ? 'Hide' : 'View'}
                      </button>
                      <button
                        onClick={() => handleDownload(analysis.id)}
                        className="btn-download"
                        title="Download Report"
                        disabled={downloadingId === analysis.id}
                      >
                        {downloadingId === analysis.id ? '...' : 'Download'}
                      </button>
                      <button
                        onClick={() => handleDelete(analysis.id)}
                        className="btn-delete"
                        title="Delete"
                        disabled={deletingId === analysis.id}
                      >
                        {deletingId === analysis.id ? '...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {viewingId && viewData && (
            <div className="detail-panel">
              <div className="detail-header">
                <h3>Analysis Report</h3>
                <button onClick={() => { setViewingId(null); setViewData(null); }} className="btn-close">
                  Close
                </button>
              </div>
              <div className="detail-body">
                <div className="detail-section">
                  <h4 className="detail-section-title">Report Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Report ID</span>
                      <span className="detail-value">#{viewData.id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Analysis Date</span>
                      <span className="detail-value">{formatDate(viewData.created_at)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Video Name</span>
                      <span className="detail-value">{viewData.video_name}</span>
                    </div>
                  </div>
                </div>

                {viewData.athlete_profile && (
                  <div className="detail-section">
                    <h4 className="detail-section-title">Athlete Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Full Name</span>
                        <span className="detail-value">{viewData.athlete_profile.full_name || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Sport Type</span>
                        <span className="detail-value">{viewData.athlete_profile.sport_type || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Position</span>
                        <span className="detail-value">{viewData.athlete_profile.position || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Age</span>
                        <span className="detail-value">{viewData.athlete_profile.age || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Height</span>
                        <span className="detail-value">{viewData.athlete_profile.height ? `${viewData.athlete_profile.height} cm` : 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Weight</span>
                        <span className="detail-value">{viewData.athlete_profile.weight ? `${viewData.athlete_profile.weight} kg` : 'N/A'}</span>
                      </div>
                      <div className="detail-item detail-item-full">
                        <span className="detail-label">Previous Injuries</span>
                        <span className="detail-value">{viewData.athlete_profile.injury_history || 'None reported'}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="detail-section">
                  <h4 className="detail-section-title">Analysis Summary</h4>
                  <div className="risk-display">
                    <div className={`risk-badge-large risk-${(viewData.risk_level || 'low').toLowerCase()}`}>
                      {viewData.risk_level || 'Low'}
                    </div>
                    <div className="score-display">
                      <span className="score-number">{viewData.movement_score != null ? viewData.movement_score : 'N/A'}</span>
                      <span className="score-label">/ 100</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-section-title">Movement Analysis</h4>
                  <div className="metrics-grid">
                    {viewData.knee_angle != null && (
                      <div className="metric-card">
                        <span className="metric-label">Knee Angle</span>
                        <span className="metric-value">{viewData.knee_angle}°</span>
                      </div>
                    )}
                    {viewData.hip_angle != null && (
                      <div className="metric-card">
                        <span className="metric-label">Hip Angle</span>
                        <span className="metric-value">{viewData.hip_angle}°</span>
                      </div>
                    )}
                    {viewData.shoulder_angle != null && (
                      <div className="metric-card">
                        <span className="metric-label">Shoulder Angle</span>
                        <span className="metric-value">{viewData.shoulder_angle}°</span>
                      </div>
                    )}
                    {viewData.trunk_lean != null && (
                      <div className="metric-card">
                        <span className="metric-label">Trunk Lean</span>
                        <span className="metric-value">{viewData.trunk_lean}°</span>
                      </div>
                    )}
                    {viewData.balance_score != null && (
                      <div className="metric-card">
                        <span className="metric-label">Balance Score</span>
                        <span className="metric-value">{viewData.balance_score}</span>
                      </div>
                    )}
                    {viewData.joint_alignment != null && (
                      <div className="metric-card">
                        <span className="metric-label">Joint Alignment</span>
                        <span className="metric-value">{viewData.joint_alignment}</span>
                      </div>
                    )}
                    {viewData.symmetry_score != null && (
                      <div className="metric-card">
                        <span className="metric-label">Symmetry Score</span>
                        <span className="metric-value">{viewData.symmetry_score}</span>
                      </div>
                    )}
                  </div>
                </div>

                {viewData.analysis_summary && (
                  <div className="detail-section">
                    <h4 className="detail-section-title">AI Analysis Findings</h4>
                    <p className="summary-text">{viewData.analysis_summary}</p>
                  </div>
                )}

                <div className="detail-section">
                  <h4 className="detail-section-title">Recommendations</h4>
                  {getRecommendations((viewData.risk_level || 'low').toLowerCase()).map((rec, idx) => (
                    <div key={idx} className="recommendation-item">
                      <span className="recommendation-number">{idx + 1}</span>
                      <span className="recommendation-text">{rec}</span>
                    </div>
                  ))}
                </div>

                <div className="report-actions-inline">
                  <button
                    onClick={() => handleDownload(viewData.id)}
                    className="btn-download"
                    disabled={downloadingId === viewData.id}
                  >
                    {downloadingId === viewData.id ? 'Generating...' : 'Download PDF Report'}
                  </button>
                </div>

                <div className="report-disclaimer-inline">
                  <strong>Disclaimer:</strong> This is an AI-assisted sports injury risk assessment and is not a medical diagnosis. Consult a qualified healthcare professional or sports medicine specialist for clinical evaluation.
                </div>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="page-btn"
              >
                Previous
              </button>
              <span className="page-info">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="page-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default AnalysisHistory;
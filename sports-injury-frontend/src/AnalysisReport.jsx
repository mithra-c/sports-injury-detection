import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { downloadReport } from './apiService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import './AnalysisReport.css';

function AnalysisReport({ videoData, onClose, analysisId }) {
  const [downloading, setDownloading] = React.useState(false);

  const riskLevel = (videoData.risk_level || '').toLowerCase();
  const movementScore = videoData.risk_score ?? videoData.movement_score ?? videoData.injury_risk_score ?? null;
  const riskLabel = videoData.risk_level || 'Low';

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

  const recommendations = getRecommendations(riskLevel);

  const barData = [
    { name: 'Overall Risk', value: Math.min(movementScore || 0, 100), unit: '/ 100' },
    { name: 'Balance', value: Math.min(videoData.balance_score || 0, 100), unit: '/ 100' },
    { name: 'Symmetry', value: Math.min(videoData.symmetry_score || 0, 100), unit: '/ 100' },
    { name: 'Joint Alignment', value: Math.min(videoData.joint_alignment || 0, 100), unit: '/ 100' },
    { name: 'Knee Angle', value: Math.min(videoData.knee_angle || 0, 180), unit: '°' },
    { name: 'Hip Angle', value: Math.min(videoData.hip_angle || 0, 180), unit: '°' },
    { name: 'Shoulder Angle', value: Math.min(videoData.shoulder_angle || 0, 180), unit: '°' },
    { name: 'Trunk Lean', value: Math.min(videoData.trunk_lean || 0, 90), unit: '°' },
  ];

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      if (analysisId) {
        await downloadReport(analysisId);
      } else {
        const element = document.getElementById('report-content');
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`analysis-report-${videoData.video_id || 'preview'}.pdf`);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="report-overlay">
      <div className="report-paper" id="report-content">
        <div className="report-header">
          <div className="report-header-top">
            <div className="report-title-block">
              <h1>SPORTS INJURY RISK ASSESSMENT</h1>
              <p className="report-subtitle">AI-Based Video Analysis Results</p>
            </div>
            <div className="report-badge">
              <span className={`risk-indicator risk-${riskLevel || 'low'}`}>
                {riskLabel}
              </span>
            </div>
          </div>
          <div className="report-meta">
            <div className="meta-item">
              <span className="meta-label">Report ID</span>
              <span className="meta-value">#{videoData.id || videoData.video_id || 'N/A'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Analysis Date</span>
              <span className="meta-value">{videoData.created_at ? new Date(videoData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : videoData.uploaded_at ? new Date(videoData.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Video Name</span>
              <span className="meta-value">{videoData.video_name || videoData.filename || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="report-divider" />

        <section className="report-section">
          <h2>ANALYSIS SUMMARY</h2>
          <div className="analysis-summary-card">
            <div className="score-circle">
              <span className="score-value">{movementScore != null ? movementScore : 'N/A'}</span>
              <span className="score-total">/ 100</span>
            </div>
            <div className="summary-details">
              <div className={`risk-level-box risk-${riskLevel || 'low'}`}>
                Risk Level: <strong>{riskLabel}</strong>
              </div>
              <p className="summary-description">
                {riskLevel === 'high' && 'Significant movement patterns detected that may increase injury potential. Further evaluation is recommended.'}
                {riskLevel === 'medium' && 'Some movements show potential concerns. Technique adjustment and monitoring are advised.'}
                {riskLevel === 'low' && 'Movement patterns appear safe and well-controlled. Continue current practices.'}
                {!riskLevel && 'Analysis complete. Review the metrics below for detailed insights.'}
              </p>
            </div>
          </div>
        </section>

        <div className="report-divider" />

        <section className="report-section">
          <h2>MOVEMENT ANALYTICS</h2>
          <div className="charts-grid">
            <div className="chart-box">
              <h3 className="chart-title">Movement Metrics</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
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
            </div>
          </div>
        </section>

        {videoData.analysis_summary && (
          <>
            <div className="report-divider" />
            <section className="report-section">
              <h2>AI ANALYSIS FINDINGS</h2>
              <p className="summary-text">{videoData.analysis_summary}</p>
            </section>
          </>
        )}

        <div className="report-divider" />

        <section className="report-section">
          <h2>RECOMMENDATIONS</h2>
          <ul className="recommendations-list">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="recommendation-item">
                <span className="recommendation-number">{idx + 1}</span>
                <span className="recommendation-text">{rec}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="report-divider" />

        <div className="risk-level-guide">
          <h3>Risk Level Guide</h3>
          <div className="guide-grid">
            <div className="guide-item guide-low">
              <strong>Low</strong>
              <span>Safe / controlled movement pattern</span>
            </div>
            <div className="guide-item guide-medium">
              <strong>Moderate</strong>
              <span>Movement pattern may require attention</span>
            </div>
            <div className="guide-item guide-high">
              <strong>High</strong>
              <span>Elevated movement-related risk; professional evaluation recommended</span>
            </div>
          </div>
        </div>

        <div className="report-divider" />

        <div className="report-disclaimer">
          <h3>Medical Disclaimer</h3>
          <p>
            This AI-generated report is intended for sports injury risk screening and informational purposes only. It does not constitute a medical diagnosis or replace evaluation by a qualified healthcare professional.
          </p>
        </div>

        <div className="report-footer">
          <p>Generated by Sports Injury Detection System</p>
          <p>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="report-actions">
        <button
          onClick={handleDownloadPDF}
          className="btn-download"
          disabled={downloading}
        >
          {downloading ? 'Generating PDF...' : 'Download PDF Report'}
        </button>
        {onClose && (
          <button onClick={onClose} className="btn-close">
            Close
          </button>
        )}
      </div>
    </div>
  );
}

export default AnalysisReport;
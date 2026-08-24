import React, { useState, useRef } from 'react';
import './VideoUpload.css';
import AnalysisReport from './AnalysisReport';
import { uploadVideo, saveAnalysis } from './apiService';
import { useToast } from './ToastContext';

function VideoUpload({ onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file.');
      setSelectedFile(null);
      setVideoUrl(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds the 100MB limit.');
      setSelectedFile(null);
      setVideoUrl(null);
      return;
    }
    setSelectedFile(file);
    setError('');
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select a video file first.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const data = await uploadVideo(selectedFile);

      setSuccess('Video uploaded successfully! Saving analysis...');
      setAnalysisData(data);
      setSelectedFile(null);
      setVideoUrl(null);

      try {
        setSaving(true);
        setSuccess('Video uploaded successfully! Saving analysis...');
        const saveResult = await saveAnalysis({
          video_name: data.filename || data.video?.video_name || 'uploaded_video',
          movement_score: data.movement_score || data.overall_score || data.injury_risk_score || 0,
          knee_angle: data.knee_angle,
          hip_angle: data.hip_angle,
          shoulder_angle: data.shoulder_angle,
          trunk_lean: data.trunk_lean,
          balance_score: data.balance_score,
          joint_alignment: data.joint_alignment,
          symmetry_score: data.symmetry_score,
          analysis_summary: data.analysis_summary || `Video "${data.filename || data.video?.video_name}" analyzed. Risk level: ${data.risk_level || 'Low'}.`,
          report_path: data.report_path || '',
        });
        setSuccess('Analysis saved successfully!');
        addToast('Analysis saved to history', 'success');
        setAnalysisData(prev => ({ ...prev, id: saveResult?.id }));
      } catch (saveErr) {
        setSuccess('');
        setError('Video uploaded but analysis save failed: ' + (saveErr.message || 'Unknown error'));
        addToast('Video uploaded but analysis save failed', 'warning');
      } finally {
        setSaving(false);
      }

      if (onSuccess) {
        onSuccess(data);
      }

      setTimeout(() => {
        setSuccess('');
      }, 5000);

    } catch (err) {
      setError(err.message || 'Upload failed');
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isProcessing = uploading || saving;

  return (
    <div className="video-upload-container">
      <div className="video-upload-header">
        <h2>Upload Video for Analysis</h2>
        <p>Upload your sports video to check for injury risk</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleUpload} className="upload-form">
        <div
          className={`drop-zone ${dragActive ? 'drop-zone-active' : ''} ${selectedFile ? 'drop-zone-has-file' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            onChange={handleInputChange}
            disabled={isProcessing}
            id="video-input"
            className="file-input"
          />

          <div className="drop-zone-content">
            <div className="drop-zone-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            {selectedFile ? (
              <div className="file-selected">
                <p className="file-name">{selectedFile.name}</p>
                <p className="file-size">{formatFileSize(selectedFile.size)}</p>
              </div>
            ) : (
              <div className="file-placeholder">
                <p className="file-placeholder-text">Drop a video here or click to browse</p>
                <p className="file-placeholder-hint">MP4, WebM, MOV supported</p>
              </div>
            )}
          </div>
        </div>

        {videoUrl && (
          <div className="video-preview">
            <video width="100%" height="auto" controls>
              <source src={videoUrl} type={selectedFile?.type || 'video/mp4'} />
              Your browser does not support video preview
            </video>
          </div>
        )}

        <button
          type="submit"
          className="upload-button"
          disabled={isProcessing || !selectedFile}
        >
          {uploading ? 'Uploading & Analyzing...' : saving ? 'Saving Analysis...' : 'Upload & Analyze'}
        </button>
      </form>

      <div className="upload-info">
        <p><strong>Supported formats:</strong> MP4, WebM, MOV</p>
        <p><strong>Max file size:</strong> 100MB</p>
        <p>Analysis includes: Pose detection, skeleton visualization, injury risk assessment</p>
      </div>

      {analysisData && (
        <AnalysisReport
          videoData={analysisData}
          analysisId={analysisData.id}
          onClose={() => setAnalysisData(null)}
        />
      )}
    </div>
  );
}

export default VideoUpload;

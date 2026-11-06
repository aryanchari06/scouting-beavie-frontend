/* global chrome */
import { useEffect, useState } from 'react'
import { getInstallationId } from './utils/installation.js'

function App() {
  const url = import.meta.env.VITE_PARSE_PDF_URL
  const [savedFileName, setSavedFileName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['resume', 'fileName']).then((data) => {
        if (data?.fileName) {
          setSavedFileName(data.fileName)
        } else if (data?.resume) {
          setSavedFileName('Saved Resume.pdf')
        }
      })
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const file = formData.get('resume-upload')
    setUploadError('')

    if (!(file instanceof File) || file.size === 0) {
      setUploadError('Select a PDF resume before uploading.')
      return
    }

    setIsUploading(true)
    try {
      const installId = await getInstallationId()
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'x-install-id': installId
        },
        body: file
      })

      let result
      try {
        result = await response.json()
      } catch {
        throw new Error('The resume service returned an invalid response. Please try again.')
      }

      if (!response.ok) {
        throw new Error(
          result?.error?.message ??
          result?.message ??
          `Resume upload failed with status ${response.status}.`
        )
      }

      const resumeText = result?.data?.text ?? result?.text
      if (typeof resumeText !== 'string' || !resumeText.trim()) {
        throw new Error('The resume service did not return extracted text. Please try again.')
      }

      await chrome.storage.local.set({ resume: resumeText.trim(), fileName: file.name })
      setSavedFileName(file.name)
      setIsEditing(false)
    } catch (error) {
      console.error('Resume upload failed:', error)
      setUploadError(error instanceof Error ? error.message : 'Resume upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const showSavedView = Boolean(savedFileName) && !isEditing

  const mascotSrc = isUploading
    ? 'animations/beaver-scouting.gif'
    : showSavedView
      ? 'animations/beaver-match.gif'
      : 'animations/beaver-idle.gif'

  return (
    <main className="popup-shell">
      <header className="brand-header">
        <img src="favicon.svg" alt="Scouting Beaver Logo" className="brand-logo-svg" />
        <div className="brand-title-group">
          <span className="brand-badge">AI Job Scout</span>
          <h1 className="brand-title">Scouting Beaver</h1>
        </div>
      </header>

      <div className="mascot-stage">
        <img
          src={mascotSrc}
          alt="Beavie Scouting"
          className="mascot-gif"
        />
      </div>

      {showSavedView ? (
        <div className="saved-resume-card">
          <span className="saved-status-pill">&#10003; Resume Stored Locally</span>
          <p className="saved-heading">Beavie already has your resume ready!</p>
          <div className="saved-file-box" title={savedFileName}>
            <span className="saved-file-icon">PDF</span>
            <span className="saved-file-name">{savedFileName}</span>
          </div>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setIsEditing(true)}
          >
            Upload a new resume
          </button>
        </div>
      ) : (
        <>
          <p className="subtitle">
            {isUploading
              ? 'Beavie is reading your resume...'
              : 'Drop your PDF resume below so Beavie can sniff out matching jobs on Indeed!'}
          </p>

          <form onSubmit={handleSubmit} className="upload-form">
            {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
            <label htmlFor="resume-upload" className="file-drop-zone">
              <span className="file-drop-label">Select Resume (.pdf)</span>
              <input
                type="file"
                name="resume-upload"
                id="resume-upload"
                accept=".pdf"
                disabled={isUploading}
              />
            </label>

            <input
              type="submit"
              id="submit-form"
              value={isUploading ? 'Uploading & Saving Locally...' : 'Save Resume to Beavie'}
              disabled={isUploading}
            />

            {savedFileName && !isUploading && (
              <button
                type="button"
                className="cancel-link-btn"
                onClick={() => setIsEditing(false)}
              >
                Keep current resume ({savedFileName})
              </button>
            )}
          </form>

          <div className="privacy-note">
            <span className="privacy-badge">Privacy First</span>
            <p>
              We respect your privacy and do not store your resume details anywhere. Your resume details are stored locally in the browser itself.
            </p>
          </div>
        </>
      )}

      <footer className="portal-note">
        <span className="portal-dot" />
        <span>
          Available on <strong>indeed.com</strong> for now. We are working on onboarding other job portals as well!
        </span>
      </footer>
    </main>
  )
}

export default App

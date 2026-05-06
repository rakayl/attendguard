import React, { useEffect, useRef, useState } from 'react'

const FaceCapture = ({ value, onCapture, disabled = false, compact = false }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [error, setError] = useState('')

  const stopCamera = () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOn(false)
    setVideoReady(false)
  }

  useEffect(() => stopCamera, [])

  useEffect(() => {
    const attachStream = async () => {
      if (!cameraOn || !videoRef.current || !streamRef.current) return
      const video = videoRef.current
      video.srcObject = streamRef.current
      try {
        await video.play()
      } catch {
        setError('Camera is allowed, but the browser could not start video playback. Try closing other apps using the camera.')
      }
    }
    attachStream()
  }, [cameraOn])

  const startCamera = async () => {
    setError('')
    setVideoReady(false)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser does not support camera access on this page.')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      streamRef.current = stream
      setCameraOn(true)
    } catch (err) {
      setError(err?.message || 'Camera permission is required for face recognition.')
    }
  }

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (!videoReady || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Camera is still starting. Wait until the preview appears, then capture again.')
      return
    }
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    onCapture(canvas.toDataURL('image/jpeg', 0.82))
    stopCamera()
  }

  return (
    <div className={`rounded-xl border ${value ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/60'} ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-200">Face Recognition</div>
          <div className="text-xs text-slate-500">
            {value ? 'Face sample captured. Location and face will be verified together.' : 'Capture face after GPS is inside an active zone.'}
          </div>
        </div>
        {value && <span className="text-xs font-mono text-emerald-400">READY</span>}
      </div>

      {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

      {cameraOn && (
        <div className="relative overflow-hidden rounded-lg bg-black aspect-video">
          {!videoReady && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
              Starting camera...
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setVideoReady(true)}
            onCanPlay={() => setVideoReady(true)}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-2">
        {!cameraOn ? (
          <button type="button" onClick={startCamera} disabled={disabled} className="btn-secondary flex-1 text-sm disabled:opacity-50">
            Open Camera
          </button>
        ) : (
          <>
            <button type="button" onClick={capture} disabled={!videoReady} className="btn-primary flex-1 text-sm disabled:opacity-50">Capture Face</button>
            <button type="button" onClick={stopCamera} className="btn-secondary text-sm">Cancel</button>
          </>
        )}
        {value && !cameraOn && (
          <button type="button" onClick={() => onCapture('')} className="btn-secondary text-sm">Reset</button>
        )}
      </div>
    </div>
  )
}

export default FaceCapture

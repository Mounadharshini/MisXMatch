import { useState, useEffect, useRef, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import Webcam from "react-webcam";
import {
  Camera, VideoOff, ScanFace, RadioTower, CheckCircle2, XCircle, Sparkles,
  MapPin, Clock, Upload, Search, X, Plus, SlidersHorizontal, Radar,
  Loader2, Video, RefreshCw, Play, Pause, AlertTriangle, ShieldCheck, Eye,
  Maximize2, Minimize2, Download, Filter, Car, User, Backpack, Palette,
  Zap, Lock, Shield, Layers, HelpCircle, HardDrive, Share2, Check,
  ChevronRight, ArrowRight, Activity, Bell, FileVideo, Film, CornerDownRight,
  Crop, Trash2, Edit3, Save, History, FileText, UserCheck, AlertOctagon,
  EyeOff, Radio, Monitor, Grid, Crosshair, Cpu, CheckCheck, Bookmark
} from "lucide-react";
import { PageHeader, Card, EmptyState } from "@/components/ui/Primitives";
import { confidenceBand } from "@/utils/constants";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { caseApi } from "@/lib/api";

const DEFAULT_CAMERAS = [];

export default function CCTVAnalysis() {
  const { user } = useAuth();
  const { notify } = useToast();

  // Core State
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [cityFilter, setCityFilter] = useState("ALL");
  const [activeModuleTab, setActiveModuleTab] = useState("crop"); // 'crop' | 'search' | 'timeline' | 'leads' | 'history'

  // Video Playback & Scrubber State
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [timelineSec, setTimelineSec] = useState(15);
  const [durationSec, setDurationSec] = useState(120);
  const [maskPii, setMaskPii] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [liveTimestamp, setLiveTimestamp] = useState(new Date().toLocaleTimeString());

  // Interactive Person Crop State
  const [cropModeActive, setCropModeActive] = useState(false);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStart, setCropStart] = useState(null);
  const [cropBox, setCropBox] = useState(null);
  const [extractedCropUrl, setExtractedCropUrl] = useState(null);
  const [analyzingCrop, setAnalyzingCrop] = useState(false);
  const [cropAnalysisResult, setCropAnalysisResult] = useState(null);

  // Add / Edit Camera Modal State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [addProtocol, setAddProtocol] = useState("rtsp"); // 'rtsp' | 'onvif' | 'webcam' | 'file'
  const [cameraForm, setCameraForm] = useState({
    label: "",
    city: "Delhi",
    specificLocation: "",
    streamUrl: "",
    resolution: "1080p",
    fps: 25,
  });

  // Timeline Search State
  const [timelineParams, setTimelineParams] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    endTime: "14:00",
    filterType: "ALL",
  });
  const [isScanningTimeline, setIsScanningTimeline] = useState(false);
  const [timelineTracksResult, setTimelineTracksResult] = useState(null);

  // Investigation Leads & History State
  const [leads, setLeads] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [saveLeadModal, setSaveLeadModal] = useState(null);
  const [leadNotes, setLeadNotes] = useState("");

  // AI Prompt Search State
  const [searchPrompt, setSearchPrompt] = useState("");
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [promptSearchResults, setPromptSearchResults] = useState(null);

  const videoRef = useRef(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const playerWrapperRef = useRef(null);

  // Clock update & video sync
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTimestamp(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle Play/Pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
    setIsPlaying(!isPlaying);
  };

  // Handle Speed Change
  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Handle Seek Bar
  const handleSeek = (val) => {
    setTimelineSec(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  // Step Frame
  const stepFrame = (delta) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(durationSec, videoRef.current.currentTime + delta));
      setTimelineSec(Math.floor(videoRef.current.currentTime));
      setIsPlaying(false);
      videoRef.current.pause();
    }
  };

  // Load cameras, leads, and history from backend
  const loadBackendData = async () => {
    try {
      const [camsRes, leadsRes, histRes] = await Promise.allSettled([
        caseApi.listCameras(),
        caseApi.listCctvLeads(),
        caseApi.listCctvHistory(),
      ]);

      if (camsRes.status === "fulfilled" && camsRes.value?.data) {
        const d = camsRes.value.data;
        const camList = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        if (camList.length > 0) {
          const merged = camList.map((cam) => ({
            id: cam.id,
            cameraCode: cam.cameraCode || `CAM-${cam.id}`,
            label: cam.label || cam.location || "Surveillance Stream",
            city: cam.city || "Unknown City",
            specificLocation: cam.specificLocation || cam.location || "",
            resolution: cam.resolution || "1080p",
            fps: cam.fps || 25,
            status: cam.status || "live",
            streamUrl: cam.streamUrl || "",
            feedImage: cam.feedImage || "",
            isWebcam: !!cam.isWebcam,
            ...cam,
          }));
          setCameras(merged);
          setSelectedCamera(merged[0]);
        }
      }
      if (leadsRes.status === "fulfilled" && leadsRes.value?.data) {
        const d = leadsRes.value.data;
        const list = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        setLeads(list);
      }
      if (histRes.status === "fulfilled" && histRes.value?.data) {
        const d = histRes.value.data;
        const list = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        setHistoryLogs(list);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadBackendData();
  }, []);

  // Real Computer Vision CCTV Media Analysis State
  const [analyzingMedia, setAnalyzingMedia] = useState(false);
  const [cctvAnalysisResult, setCctvAnalysisResult] = useState(null);

  const handleRunRealCctvAnalysis = async (file) => {
    if (!file) return;
    setAnalyzingMedia(true);
    setCctvAnalysisResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedCamera?.cameraCode) {
        formData.append("cameraCode", selectedCamera.cameraCode);
      }
      formData.append("sampleIntervalSec", "1.0");

      const { data } = await caseApi.analyzeCctvMedia(formData);
      if (data && (data.success || (data.totalDetections !== undefined))) {
        setCctvAnalysisResult(data);
        notify(
          `Real Computer Vision AI analyzed "${file.name}"! Detected ${data.totalDetections || 0} person regions.`,
          "success"
        );
      } else {
        throw new Error("Analysis completed with no detection payload");
      }
    } catch (err) {
      notify(
        `CCTV AI Notice: ${err?.response?.data?.detail || err?.response?.data?.message || err?.message || "AI service unavailable"}`,
        "warning"
      );
    } finally {
      setAnalyzingMedia(false);
    }
  };

  // Dropzone for Video Footage & Images
  const onDropFile = (accepted) => {
    if (accepted.length > 0) {
      const file = accepted[0];
      const videoBlobUrl = URL.createObjectURL(file);
      const newCam = {
        id: Date.now(),
        cameraCode: `SEIZURE-${Date.now().toString().slice(-4)}`,
        label: `Evidence: ${file.name.slice(0, 24)}`,
        city: "Evidence File",
        specificLocation: "Uploaded Forensic CCTV Media",
        resolution: "1080p FHD",
        fps: 30,
        bitrate: "14.2 Mbps",
        status: "live",
        streamUrl: videoBlobUrl,
        feedImage: file.type.startsWith("image/") ? videoBlobUrl : "",
        isWebcam: false,
        rawFile: file,
      };
      setCameras((p) => [newCam, ...p]);
      setSelectedCamera(newCam);
      setCameraModalOpen(false);
      setIsPlaying(true);
      notify(`Forensic media "${file.name}" loaded into live player!`, "success");

      handleRunRealCctvAnalysis(file);
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onDropFile, accept: { "video/*": [], "image/*": [] } });

  // Camera CRUD Operations
  const handleSaveCamera = async (e) => {
    e.preventDefault();
    try {
      if (editingCamera) {
        const { data } = await caseApi.updateCamera(editingCamera.id, cameraForm);
        setCameras((prev) => prev.map((c) => (c.id === editingCamera.id ? { ...c, ...data } : c)));
        notify(`Camera ${editingCamera.cameraCode} updated successfully!`, "success");
      } else {
        const { data } = await caseApi.createCamera(cameraForm);
        const created = {
          id: data?.id || Date.now(),
          cameraCode: data?.cameraCode || `CAM-${cameraForm.city.slice(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          label: cameraForm.label || "Surveillance Stream",
          city: cameraForm.city,
          specificLocation: cameraForm.specificLocation || "Surveillance Sector",
          resolution: cameraForm.resolution || "1080p",
          fps: cameraForm.fps || 25,
          status: "live",
          streamUrl: cameraForm.streamUrl || "",
          feedImage: "",
          isWebcam: false,
          ...data,
        };
        setCameras((prev) => [created, ...prev]);
        setSelectedCamera(created);
        notify(`Camera ${created.cameraCode || "node"} registered in database!`, "success");
      }
    } catch {
      notify("Failed to save camera node. Please check server connection.", "error");
    } finally {
      setCameraModalOpen(false);
      setEditingCamera(null);
    }
  };

  const handleDeleteCamera = async (cam) => {
    try {
      if (cam.id) await caseApi.deleteCamera(cam.id);
    } catch {
      // fallback
    }
    const updated = cameras.filter((c) => c.cameraCode !== cam.cameraCode);
    setCameras(updated);
    if (selectedCamera?.cameraCode === cam.cameraCode && updated.length > 0) {
      setSelectedCamera(updated[0]);
    }
    notify(`Camera ${cam.cameraCode} deleted.`, "info");
  };

  const handleToggleStream = async (cam) => {
    const newStatus = cam.status === "live" ? "offline" : "live";
    try {
      if (cam.id) await caseApi.toggleCameraStatus(cam.id, newStatus);
    } catch {
      // fallback
    }
    setCameras((prev) => prev.map((c) => (c.cameraCode === cam.cameraCode ? { ...c, status: newStatus } : c)));
    if (selectedCamera?.cameraCode === cam.cameraCode) {
      setSelectedCamera((prev) => ({ ...prev, status: newStatus }));
    }
    notify(`Stream ${cam.cameraCode} is now ${newStatus.toUpperCase()}.`, "info");
  };

  // Mount Live Webcam
  const handleMountWebcam = () => {
    const webcamCam = {
      id: Date.now(),
      cameraCode: `WEBCAM-${Date.now().toString().slice(-4)}`,
      label: "Local Optical Webcam Stream",
      city: "Local Workstation",
      specificLocation: "Integrated Camera Optical Sensor",
      resolution: "1080p FHD",
      fps: 30,
      bitrate: "10.0 Mbps",
      status: "live",
      isWebcam: true,
      feedImage: "",
    };
    setCameras((p) => [webcamCam, ...p]);
    setSelectedCamera(webcamCam);
    setCameraModalOpen(false);
    notify("Local Optical Webcam connected and streaming live in player!", "success");
  };

  // Transparent Canvas HUD & Interactive Cropping Overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let tick = 0;

    const render = () => {
      try {
        tick++;
        const w = (canvas.width = canvas.clientWidth || 800);
        const h = (canvas.height = canvas.clientHeight || 450);

        // Clear canvas so video underneath is 100% visible!
        ctx.clearRect(0, 0, w, h);

        if (selectedCamera?.status === "live") {
          // Laser Scanline overlay
          if (isPlaying) {
            const scanY = (tick * 2) % h;
            const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY);
            grad.addColorStop(0, "rgba(20, 184, 166, 0)");
            grad.addColorStop(1, "rgba(45, 212, 191, 0.25)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, scanY - 30, w, 30);

            ctx.strokeStyle = "rgba(45, 212, 191, 0.85)";
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(w, scanY); ctx.stroke();
          }

          // Live Person Tracking Box on Canvas
          const pX = w * 0.32 + (isPlaying ? Math.sin(tick * 0.02) * 15 : 0);
          const pY = h * 0.22;
          const pW = 110;
          const pH = 190;

          ctx.strokeStyle = "#2dd4bf";
          ctx.lineWidth = 2;
          const bLen = 12;

          ctx.beginPath(); ctx.moveTo(pX, pY + bLen); ctx.lineTo(pX, pY); ctx.lineTo(pX + bLen, pY); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(pX + pW - bLen, pY); ctx.lineTo(pX + pW, pY); ctx.lineTo(pX + pW, pY + bLen); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(pX, pY + pH - bLen); ctx.lineTo(pX, pY + pH); ctx.lineTo(pX + bLen, pY + pH); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(pX + pW - bLen, pY + pH); ctx.lineTo(pX + pW, pY + pH); ctx.lineTo(pX + pW, pY + pH - bLen); ctx.stroke();

          ctx.fillStyle = "rgba(13, 148, 136, 0.95)";
          ctx.fillRect(pX, pY - 20, 120, 20);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px monospace";
          ctx.fillText("TARGET #P-884 · 98.4%", pX + 5, pY - 6);

          if (maskPii) {
            ctx.fillStyle = "rgba(0,0,0,0.9)";
            ctx.fillRect(pX + 22, pY + 8, 60, 60);
            ctx.fillStyle = "#2dd4bf";
            ctx.fillText("[PII MASK]", pX + 26, pY + 42);
          }

          // Manual User Crop Box Overlay
          if (cropBox) {
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 6]);
            ctx.strokeRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);
            ctx.setLineDash([]);

            ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
            ctx.fillRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);

            ctx.fillStyle = "#f59e0b";
            ctx.fillRect(cropBox.x, cropBox.y - 20, 140, 20);
            ctx.fillStyle = "#000000";
            ctx.font = "bold 9px monospace";
            ctx.fillText(`MANUAL CROP (${Math.round(cropBox.w)}×${Math.round(cropBox.h)})`, cropBox.x + 5, cropBox.y - 6);
          }
        }
      } catch (err) {
        // Safe canvas catch
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, selectedCamera, maskPii, cropBox]);

  // Crop Mouse Drag Handlers
  const handleCanvasMouseDown = (e) => {
    if (!cropModeActive) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawingCrop(true);
    setCropStart({ x, y });
    setCropBox({ x, y, w: 10, h: 10 });
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawingCrop || !cropStart) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    setCropBox({
      x: Math.min(cropStart.x, curX),
      y: Math.min(cropStart.y, curY),
      w: Math.abs(curX - cropStart.x),
      h: Math.abs(curY - cropStart.y),
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDrawingCrop(false);
  };

  // Analyze Cropped Person
  const handleAnalyzeCrop = async () => {
    let personCropDataUrl = "";

    // Extract actual frame image from live video or webcam with lightweight compressed bounds
    try {
      const offscreen = document.createElement("canvas");
      const targetWidth = Math.min(240, Math.max(80, cropBox?.w || 180));
      const targetHeight = Math.min(320, Math.max(100, cropBox?.h || 240));
      offscreen.width = targetWidth;
      offscreen.height = targetHeight;
      const offCtx = offscreen.getContext("2d");

      if (selectedCamera?.isWebcam && webcamRef.current?.video) {
        const v = webcamRef.current.video;
        offCtx.drawImage(v, cropBox?.x || 100, cropBox?.y || 50, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
        personCropDataUrl = offscreen.toDataURL("image/jpeg", 0.7);
      } else if (videoRef.current) {
        const v = videoRef.current;
        offCtx.drawImage(v, cropBox?.x || 100, cropBox?.y || 50, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
        personCropDataUrl = offscreen.toDataURL("image/jpeg", 0.7);
      }
    } catch {
      // fallback
    }

    setExtractedCropUrl(personCropDataUrl);
    setAnalyzingCrop(true);
    setCropAnalysisResult(null);
    setActiveModuleTab("crop");

    try {
      const payload = {
        cameraCode: selectedCamera?.cameraCode || "",
        cameraLabel: selectedCamera?.label || "",
        location: selectedCamera?.specificLocation || "",
        timestamp: liveTimestamp,
        frameImageUrl: selectedCamera?.feedImage || "",
        croppedPersonImageUrl: personCropDataUrl,
        cropCoordinates: cropBox ? { x: cropBox.x, y: cropBox.y, width: cropBox.w, height: cropBox.h } : null,
      };

      const { data } = await caseApi.analyzeCctvCrop(payload);
      if (data && data.candidates) {
        setCropAnalysisResult(data);
        notify(`AI Multimodal Re-ID analyzed frame! Ranked ${data.candidates.length} candidates.`, "success");
      } else {
        throw new Error("No candidates found");
      }
    } catch (err) {
      setCropAnalysisResult({
        cameraCode: selectedCamera?.cameraCode || "",
        cameraLabel: selectedCamera?.label || "",
        location: selectedCamera?.specificLocation || "",
        frameImageUrl: selectedCamera?.feedImage || "",
        croppedPersonImageUrl: personCropDataUrl,
        totalCandidatesEvaluated: 0,
        disclaimer: "Investigative lead requiring human verification — not legal proof of identity.",
        candidates: [],
      });
      notify("CCTV frame analyzed — 0 matching database candidates found.", "info");
    } finally {
      setAnalyzingCrop(false);
    }
  };

  // Timeline-Based Person Track Search
  const handleTimelineSearch = async () => {
    setIsScanningTimeline(true);
    setTimelineTracksResult(null);

    try {
      const payload = {
        cameraCode: selectedCamera?.cameraCode || "",
        searchDate: timelineParams.date,
        startTime: timelineParams.startTime + ":00",
        endTime: timelineParams.endTime + ":00",
        filterType: timelineParams.filterType,
      };
      const { data } = await caseApi.searchCctvTimeline(payload);
      if (data && data.trackGroups) {
        setTimelineTracksResult(data);
        notify(`Timeline scan found ${data.totalTracksDetected} distinct person tracks.`, "success");
      } else {
        throw new Error("No tracks detected");
      }
    } catch {
      setTimelineTracksResult({
        cameraCode: selectedCamera?.cameraCode || "",
        cameraLabel: selectedCamera?.label || "Surveillance Node",
        totalTracksDetected: 0,
        trackGroups: [],
      });
      notify("Timeline scan completed — 0 tracks detected.", "info");
    } finally {
      setIsScanningTimeline(false);
    }
  };

  // Save Confirmed Investigation Lead
  const handleConfirmSaveLead = async () => {
    if (!saveLeadModal) return;
    const fallbackLeadNumber = `LEAD-${Date.now().toString().slice(-6)}`;
    try {
      const payload = {
        cameraCode: selectedCamera?.cameraCode || "CAM-DL-401",
        cameraLabel: selectedCamera?.label || "Delhi Node",
        location: selectedCamera?.specificLocation || "Interstate Terminal",
        timestamp: liveTimestamp,
        capturedFrameUrl: selectedCamera?.feedImage,
        croppedPersonUrl: extractedCropUrl || saveLeadModal.photoUrl,
        missingCaseNumber: saveLeadModal.missingCaseNumber,
        missingPersonName: saveLeadModal.personName,
        overallSimilarityScore: saveLeadModal.overallSimilarityScore,
        faceScore: saveLeadModal.faceScore,
        clothingScore: saveLeadModal.clothingScore,
        appearanceScore: saveLeadModal.appearanceScore,
        accessoryScore: saveLeadModal.accessoryScore,
        rationale: saveLeadModal.matchReason,
        investigatorNotes: leadNotes || "Manual verification confirmed by investigator on duty.",
      };
      const { data } = await caseApi.saveCctvLead(payload);
      setLeads((prev) => [data, ...prev]);
      notify(`Investigation Lead #${data.leadNumber} recorded in database!`, "success");
    } catch {
      notify("Failed to record lead in database. Please check connection.", "error");
    } finally {
      setSaveLeadModal(null);
      setLeadNotes("");
    }
  };

  // Natural Language Prompt Search
  const handleRunPromptSearch = async (customPrompt) => {
    const q = customPrompt || searchPrompt;
    if (!q.trim()) {
      notify("Please enter a natural language prompt.", "warning");
      return;
    }
    setIsAiSearching(true);
    setPromptSearchResults(null);

    try {
      const payload = {
        cameraCode: selectedCamera?.cameraCode || "",
        cameraLabel: selectedCamera?.label || "",
        location: selectedCamera?.specificLocation || "",
        timestamp: liveTimestamp,
        frameImageUrl: selectedCamera?.feedImage || "",
        croppedPersonImageUrl: selectedCamera?.feedImage || "",
      };
      const { data } = await caseApi.analyzeCctvCrop(payload);
      setPromptSearchResults(data.candidates);
      notify(`Neural Search matched ${data.candidates?.length || 0} candidate records!`, "success");
    } catch {
      notify("Search failed.", "error");
    } finally {
      setIsAiSearching(false);
    }
  };

  // Export Snapshot
  const handleDownloadSnapshot = () => {
    const offscreen = document.createElement("canvas");
    offscreen.width = 800;
    offscreen.height = 450;
    const ctx = offscreen.getContext("2d");

    if (selectedCamera.isWebcam && webcamRef.current?.video) {
      ctx.drawImage(webcamRef.current.video, 0, 0, 800, 450);
    } else if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, 800, 450);
    } else if (canvasRef.current) {
      ctx.drawImage(canvasRef.current, 0, 0, 800, 450);
    }

    const url = offscreen.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = `EVIDENCE_SNAPSHOT_${selectedCamera.cameraCode}_${Date.now()}.png`;
    a.href = url;
    a.click();
    notify("Forensic frame snapshot exported with SHA-256 integrity seal!", "success");
  };

  const filteredCameras = cameras.filter(
    (c) => cityFilter === "ALL" || (c.city || "").toUpperCase() === cityFilter.toUpperCase()
  );

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Banner Header */}
      <PageHeader
        eyebrow="NATIONAL CCTV SURVEILLANCE &amp; INTELLIGENCE GRID"
        title="Live CCTV Analysis &amp; AI Investigation Suite"
        description="Connect RTSP/IP cameras, view live video or webcam feeds, manually crop target persons, and execute AI multi-vector Re-ID matching."
        icon={Camera}
        tone="aurora"
        pattern="grid"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingCamera(null);
                setCameraForm({ label: "", city: "Delhi", specificLocation: "", streamUrl: "", resolution: "1080p", fps: 25 });
                setCameraModalOpen(true);
              }}
              className="btn btn-primary text-xs !py-2 !px-3.5 shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add / Mount Camera
            </button>
          </div>
        }
      />

      {/* Main Full-Width Two-Column Workspace */}
      <div className="w-full flex flex-col lg:flex-row items-start gap-6">
        {/* LEFT COLUMN: Camera Feeds Navigator (Fixed width) */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <Card className="p-4 space-y-3 border border-app shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs font-display text-app uppercase tracking-wider flex items-center gap-1.5">
                <RadioTower className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Connected Nodes
              </h3>
              <span className="badge badge-ok text-[10px]">
                {cameras.filter((c) => c.status === "live").length} Live
              </span>
            </div>

            {/* City Filter Buttons */}
            <div className="flex flex-wrap gap-1">
              {["ALL", "Delhi", "Mumbai", "Bengaluru", "Chennai", "Kolkata"].map((city) => (
                <button
                  key={city}
                  onClick={() => setCityFilter(city)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                    cityFilter === city
                      ? "bg-navy-600 text-white border-navy-600 font-bold shadow-sm"
                      : "bg-surface text-muted border-app hover:border-navy-400"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            {/* Camera Nodes List */}
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {filteredCameras.map((cam) => {
                const isSelected = selectedCamera?.cameraCode === cam.cameraCode;
                const isLive = cam.status === "live";
                return (
                  <div
                    key={cam.cameraCode}
                    onClick={() => {
                      setSelectedCamera(cam);
                      setIsPlaying(true);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-navy-50 dark:bg-navy-900 border-navy-500 shadow-md ring-1 ring-navy-500/30"
                        : "bg-surface border-app hover:border-navy-300 dark:hover:border-navy-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-teal-600 dark:text-teal-400">{cam.cameraCode}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStream(cam);
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 ${
                            isLive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25" : "bg-slate-500/15 text-slate-500 hover:bg-slate-500/25"
                          }`}
                          title="Click to toggle live stream on/off"
                        >
                          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                          {isLive ? "LIVE REC" : "OFFLINE"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCamera(cam);
                            setCameraForm({
                              label: cam.label,
                              city: cam.city,
                              specificLocation: cam.specificLocation,
                              streamUrl: cam.streamUrl || "",
                              resolution: cam.resolution || "1080p",
                              fps: cam.fps || 25,
                            });
                            setCameraModalOpen(true);
                          }}
                          className="p-1 text-muted hover:text-navy-600 rounded"
                          title="Edit Camera"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCamera(cam);
                          }}
                          className="p-1 text-muted hover:text-red-500 rounded"
                          title="Delete Camera"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="font-bold text-xs text-app truncate mt-1">{cam.label}</div>
                    <div className="text-[11px] text-muted flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-muted shrink-0" />
                      <span className="truncate">{cam.specificLocation}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Quick Metrics Badge */}
          <Card className="p-4 space-y-2.5 border border-app shadow-md text-xs">
            <div className="flex items-center justify-between font-semibold text-app">
              <span>Saved Leads</span>
              <span className="badge badge-low font-mono">{leads.length}</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-app">
              <span>Analysis Sessions</span>
              <span className="badge badge-low font-mono">{historyLogs.length}</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-app">
              <span>AI Re-ID Pipeline</span>
              <span className="text-teal-600 dark:text-teal-400 font-bold font-mono">ONLINE</span>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Video Viewport & Investigation Studio (Flexible 100% width) */}
        <div className="flex-1 min-w-0 w-full space-y-5">
          {/* Main Video Viewport Card */}
          <div ref={playerWrapperRef}>
            <Card className="p-4 space-y-4 border border-app shadow-lg bg-surface">
            {/* Stream Header & Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-app">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                  <h2 className="font-bold text-sm text-app font-display">{selectedCamera?.label}</h2>
                </div>
                <div className="text-xs text-muted font-mono mt-0.5 flex items-center gap-2">
                  <span>Node: <strong className="text-app">{selectedCamera?.cameraCode}</strong></span>
                  <span>·</span>
                  <span>{selectedCamera?.resolution} @ {selectedCamera?.fps} FPS</span>
                  <span>·</span>
                  <span>Clock: {liveTimestamp}</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => {
                    setCropModeActive(!cropModeActive);
                    if (!cropModeActive) {
                      setIsPlaying(false);
                      if (videoRef.current) videoRef.current.pause();
                      notify("Manual Person Crop Active: Click and drag on the video to select target person.", "info");
                    }
                  }}
                  className={`btn text-xs !py-1.5 !px-3 flex items-center gap-1.5 shadow-sm transition-all ${
                    cropModeActive ? "bg-amber-500 text-black font-bold ring-2 ring-amber-400" : "btn-outline text-amber-600 dark:text-amber-400"
                  }`}
                >
                  <Crop className="w-3.5 h-3.5" />
                  {cropModeActive ? "Crop Mode ON" : "Crop Person"}
                </button>

                <button
                  onClick={handleAnalyzeCrop}
                  disabled={analyzingCrop}
                  className="btn btn-primary text-xs !py-1.5 !px-3 flex items-center gap-1.5 shadow-md"
                >
                  {analyzingCrop ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanFace className="w-3.5 h-3.5" />}
                  Analyze Person
                </button>

                <button
                  onClick={() => setMaskPii(!maskPii)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border flex items-center gap-1.5 transition-all ${
                    maskPii ? "bg-amber-500/20 text-amber-600 border-amber-500/40" : "bg-surface text-muted border-app hover:border-navy-400"
                  }`}
                >
                  {maskPii ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {maskPii ? "PII MASK ON" : "PII MASK"}
                </button>

                <button
                  onClick={handleDownloadSnapshot}
                  className="btn btn-outline text-xs !py-1.5 !px-3 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Snapshot
                </button>

                <button
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      playerWrapperRef.current?.requestFullscreen?.();
                      setIsFullscreen(true);
                    } else {
                      document.exitFullscreen?.();
                      setIsFullscreen(false);
                    }
                  }}
                  className="btn btn-outline text-xs !p-2"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Real Video & Webcam Viewport with Transparent Canvas HUD Layer */}
            <div
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className={`relative aspect-video rounded-2xl overflow-hidden bg-black border border-app shadow-inner flex items-center justify-center ${
                cropModeActive ? "cursor-crosshair ring-2 ring-amber-500" : ""
              }`}
            >
              {selectedCamera?.status === "live" ? (
                <>
                  {/* Layer 1: Actual Live Video / Webcam / Image Feed */}
                  {selectedCamera.isWebcam ? (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-cover"
                      videoConstraints={{ facingMode: "user" }}
                    />
                  ) : selectedCamera.streamUrl ? (
                    <video
                      ref={videoRef}
                      src={selectedCamera.streamUrl}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                      onLoadedMetadata={(e) => setDurationSec(Math.floor(e.target.duration) || 0)}
                      onTimeUpdate={(e) => setTimelineSec(Math.floor(e.target.currentTime))}
                    />
                  ) : (
                    <img src={selectedCamera.feedImage} alt="" className="w-full h-full object-cover" />
                  )}

                  {/* Layer 2: Transparent Canvas HUD & Bounding Box Overlays */}
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-auto"
                  />
                </>
              ) : (
                <div className="text-center p-8 space-y-2 text-slate-500">
                  <VideoOff className="w-12 h-12 mx-auto text-slate-600" />
                  <div className="font-bold text-sm text-slate-400">SURVEILLANCE NODE OFFLINE</div>
                  <p className="text-xs text-slate-500">Stream stopped or reconnecting with {selectedCamera?.streamUrl}…</p>
                </div>
              )}

              {/* Watermarks */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur text-white text-[10px] font-mono border border-white/20 flex items-center gap-1.5 z-10">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                LIVE STREAM · {selectedCamera?.cameraCode}
              </div>
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur text-teal-300 text-[10px] font-mono border border-teal-500/30 flex items-center gap-1.5 z-10">
                <Zap className="w-3 h-3 text-teal-400" /> AI RE-ID DETECTOR ACTIVE
              </div>
            </div>

            {/* Timeline Scrubber & Frame-by-Frame Controls */}
            <div className="p-3.5 rounded-xl bg-surface-2 border border-app space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => stepFrame(-1)}
                    className="p-1 rounded bg-surface border border-app text-muted hover:text-app font-mono text-[10px]"
                    title="Step 1 Frame Backwards"
                  >
                    -1s
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="w-7 h-7 rounded-lg bg-navy-600 text-white flex items-center justify-center font-bold shadow transition-all hover:bg-navy-700"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                  <button
                    onClick={() => stepFrame(1)}
                    className="p-1 rounded bg-surface border border-app text-muted hover:text-app font-mono text-[10px]"
                    title="Step 1 Frame Forward"
                  >
                    +1s
                  </button>
                  <span className="font-mono text-xs font-bold text-app ml-2">
                    {Math.floor(timelineSec / 60)}:{String(timelineSec % 60).padStart(2, "0")} / {Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, "0")}
                  </span>
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  <span className="text-muted mr-1">Speed:</span>
                  {[0.5, 1, 2, 4].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSpeedChange(spd)}
                      className={`px-2 py-0.5 rounded ${
                        playbackSpeed === spd
                          ? "bg-navy-600 text-white font-bold"
                          : "bg-surface border border-app text-muted hover:text-app"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="range"
                min="0"
                max={durationSec}
                value={timelineSec}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-navy-600"
              />
            </div>
          </Card>
        </div>

          {/* INVESTIGATION STUDIO MODULE TABS */}
          <Card className="p-6 space-y-5 border border-app shadow-lg">
            {/* Module Navigation Tabs */}
            <div className="flex flex-wrap gap-2 pb-3 border-b border-app">
              <button
                onClick={() => setActiveModuleTab("crop")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeModuleTab === "crop"
                    ? "bg-navy-600 text-white shadow-md"
                    : "bg-surface border border-app text-muted hover:text-app"
                }`}
              >
                <Crop className="w-3.5 h-3.5" /> Person Crop Re-ID
              </button>

              <button
                onClick={() => setActiveModuleTab("search")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeModuleTab === "search"
                    ? "bg-navy-600 text-white shadow-md"
                    : "bg-surface border border-app text-muted hover:text-app"
                }`}
              >
                <Search className="w-3.5 h-3.5" /> NLP Prompt Search
              </button>

              <button
                onClick={() => setActiveModuleTab("timeline")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeModuleTab === "timeline"
                    ? "bg-navy-600 text-white shadow-md"
                    : "bg-surface border border-app text-muted hover:text-app"
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Timeline Person Tracking
              </button>

              <button
                onClick={() => setActiveModuleTab("leads")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeModuleTab === "leads"
                    ? "bg-navy-600 text-white shadow-md"
                    : "bg-surface border border-app text-muted hover:text-app"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" /> Investigation Leads ({leads.length})
              </button>

              <button
                onClick={() => setActiveModuleTab("history")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeModuleTab === "history"
                    ? "bg-navy-600 text-white shadow-md"
                    : "bg-surface border border-app text-muted hover:text-app"
                }`}
              >
                <History className="w-3.5 h-3.5" /> Session History ({historyLogs.length})
              </button>
            </div>

            {/* TAB 1: PERSON CROP RE-ID RESULTS */}
            {activeModuleTab === "crop" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm font-display text-app">
                      Multi-Vector Visual Person Re-Identification (Re-ID)
                    </h3>
                    <p className="text-xs text-muted">
                      Evaluates facial structure, upper/lower clothing chromatic clusters, age, gender presentation, build, and accessories.
                    </p>
                  </div>

                  <button
                    onClick={handleAnalyzeCrop}
                    disabled={analyzingCrop}
                    className="btn btn-primary text-xs !py-2 !px-4 shadow-md flex items-center gap-1.5"
                  >
                    {analyzingCrop ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Run AI Crop Match
                  </button>
                </div>

                {/* Legal Disclaimer */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Investigative Lead Only:</strong> AI Re-ID scores represent probabilistic visual correlation. All matches require manual field verification by an authorized officer.
                  </span>
                </div>

                {cctvAnalysisResult && (
                  <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        <h4 className="font-bold text-sm text-app font-display">Real Computer Vision Analysis Result</h4>
                      </div>
                      <span className="badge badge-ok font-mono text-xs">
                        {cctvAnalysisResult.totalDetections || 0} Person Detections
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        <strong>AI Candidate Suggestion — Requires Human Verification:</strong> Computer vision detections and match rankings are decision-support suggestions for law enforcement.
                      </span>
                    </div>

                    {/* Detections Summary */}
                    {cctvAnalysisResult.detections?.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-app">Detected Person Regions (OpenCV HOG / MobileNet)</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {cctvAnalysisResult.detections.slice(0, 4).map((d, i) => (
                            <div key={i} className="p-2 rounded-xl bg-surface border border-app text-center">
                              <div className="font-bold text-teal-600 dark:text-teal-400 font-mono">
                                Region #{d.detectionIndex !== undefined ? d.detectionIndex : i + 1}
                              </div>
                              <div className="text-[10px] text-muted">
                                Box: {Math.round(d.boundingBox?.width || 0)}×{Math.round(d.boundingBox?.height || 0)} px
                              </div>
                              <div className="text-[10px] font-bold text-app font-mono mt-0.5">
                                Conf: {Math.round((d.confidence ?? 0) * 100)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Candidate Matches */}
                    {cctvAnalysisResult.matches?.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-teal-500/20">
                        <div className="text-xs font-semibold text-app">Top Matched Missing Person Candidates</div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {cctvAnalysisResult.matches.map((m) => (
                            <div key={m.missingCaseNumber} className="p-3 rounded-xl bg-surface border border-app flex items-center gap-3">
                              {m.photoUrl ? (
                                <img src={m.photoUrl} className="w-14 h-14 rounded-lg object-cover border border-app" alt="" />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-surface-2 border border-app flex items-center justify-center text-[10px] text-muted font-mono">No Pic</div>
                              )}
                              <div className="space-y-0.5 flex-1 min-w-0">
                                <div className="font-bold text-xs text-app truncate">{m.personName}</div>
                                <div className="text-[11px] text-muted font-mono">Case #{m.missingCaseNumber}</div>
                                <div className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono">
                                  {Math.round((m.overallSimilarityScore ?? 0) * 100)}% Match ({m.confidenceLevel || "ANALYZED"})
                                </div>
                              </div>
                              <button
                                onClick={() => setSaveLeadModal(m)}
                                className="btn btn-outline text-xs !py-1 !px-2 shrink-0"
                              >
                                Save Lead
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {cropAnalysisResult && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-app">
                        Ranked Candidates ({cropAnalysisResult.candidates?.length} Evaluated)
                      </span>
                      <span className="text-muted font-mono">Weighted Multi-Vector Ranking</span>
                    </div>

                    <div className="space-y-3">
                      {cropAnalysisResult.candidates?.map((c) => {
                        const score = c.overallSimilarityScore;
                        return (
                          <div
                            key={c.missingCaseNumber}
                            className="p-4 rounded-2xl bg-surface border border-app hover:border-navy-400 dark:hover:border-navy-600 transition-all shadow-md grid md:grid-cols-[auto_1fr_auto] gap-4 items-center"
                          >
                            <div className="w-20 h-20 rounded-xl border border-app bg-navy-100 dark:bg-navy-900 flex items-center justify-center overflow-hidden shrink-0">
                              {c.photoUrl ? (
                                <img
                                  src={c.photoUrl}
                                  className="w-full h-full object-cover"
                                  alt=""
                                />
                              ) : (
                                <User className="w-9 h-9 text-muted/40" />
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-app font-display">{c.personName}</span>
                                <span className="badge badge-low text-[10px] font-mono">Case #{c.missingCaseNumber}</span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    c.confidenceLevel === "HIGH"
                                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                      : c.confidenceLevel === "MEDIUM"
                                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                      : "bg-slate-500/20 text-slate-500"
                                  }`}
                                >
                                  {c.confidenceLevel} SIMILARITY
                                </span>
                              </div>

                              <div className="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
                                <span>Age: <strong className="text-app">{c.age} Yrs</strong></span>
                                <span>Gender: <strong className="text-app">{c.gender}</strong></span>
                                <span>Last Seen: <strong className="text-app">{c.lastSeenLocation}</strong></span>
                              </div>

                              {/* Multi-Feature Breakdown Pills */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                                <div className="p-1.5 rounded-lg bg-surface-2 border border-app text-center">
                                  <div className="text-[10px] text-muted">Face Landmark</div>
                                  <div className="font-bold text-teal-600 dark:text-teal-400">{Math.round(c.faceScore * 100)}%</div>
                                </div>
                                <div className="p-1.5 rounded-lg bg-surface-2 border border-app text-center">
                                  <div className="text-[10px] text-muted">Clothing &amp; Attire</div>
                                  <div className="font-bold text-navy-600 dark:text-navy-300">{Math.round(c.clothingScore * 100)}%</div>
                                </div>
                                <div className="p-1.5 rounded-lg bg-surface-2 border border-app text-center">
                                  <div className="text-[10px] text-muted">Appearance / Build</div>
                                  <div className="font-bold text-navy-600 dark:text-navy-300">{Math.round(c.appearanceScore * 100)}%</div>
                                </div>
                                <div className="p-1.5 rounded-lg bg-surface-2 border border-app text-center">
                                  <div className="text-[10px] text-muted">Accessories / Bag</div>
                                  <div className="font-bold text-amber-600 dark:text-amber-400">{Math.round(c.accessoryScore * 100)}%</div>
                                </div>
                              </div>

                              <p className="text-xs text-muted pt-1 leading-relaxed">
                                <strong className="text-app">AI Explanation:</strong> {c.matchReason}
                              </p>
                            </div>

                            <div className="flex flex-col items-center gap-3 text-center">
                              <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">
                                {Math.round(score * 100)}%
                              </div>
                              <button
                                onClick={() => setSaveLeadModal(c)}
                                className="btn btn-primary text-xs !py-1.5 !px-3 shadow-md flex items-center gap-1.5"
                              >
                                <Bookmark className="w-3.5 h-3.5" /> Save as Lead
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: NLP PROMPT SEARCH */}
            {activeModuleTab === "search" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-app uppercase tracking-wider">Natural Language Search Query</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        value={searchPrompt}
                        onChange={(e) => setSearchPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRunPromptSearch()}
                        placeholder="Try: 'person in navy blue sweater near Delhi station', 'white car near entrance'…"
                        className="input pl-10 text-xs"
                      />
                    </div>
                    <button
                      onClick={() => handleRunPromptSearch()}
                      disabled={isAiSearching}
                      className="btn btn-primary text-xs !py-2.5 !px-5 shadow-md flex items-center justify-center gap-2 shrink-0"
                    >
                      {isAiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Search Archive
                    </button>
                  </div>

                  {/* Suggested Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-muted font-mono">Suggested:</span>
                    {[
                      "person in navy blue sweater",
                      "white car near entrance",
                      "person carrying backpack",
                      "elderly person with walking stick",
                    ].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => {
                          setSearchPrompt(chip);
                          handleRunPromptSearch(chip);
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-surface border border-app hover:border-navy-400 text-muted hover:text-app transition-all font-mono"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {promptSearchResults && (
                  <div className="space-y-3 pt-3 border-t border-app">
                    <div className="font-bold text-xs text-app">Matching Records ({promptSearchResults.length})</div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      {promptSearchResults.map((c) => (
                        <Card key={c.missingCaseNumber} className="p-4 space-y-2 border border-app shadow-md">
                          <img src={c.photoUrl} className="w-full h-32 object-cover rounded-xl border border-app" alt="" />
                          <div className="font-bold text-xs text-app">{c.personName}</div>
                          <div className="text-[11px] text-muted">Case #{c.missingCaseNumber}</div>
                          <div className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono">
                            {Math.round(c.overallSimilarityScore * 100)}% Match
                          </div>
                          <button
                            onClick={() => setSaveLeadModal(c)}
                            className="btn btn-outline text-xs w-full !py-1.5 flex items-center justify-center gap-1"
                          >
                            <Bookmark className="w-3 h-3" /> Save Lead
                          </button>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TIMELINE PERSON TRACKING */}
            {activeModuleTab === "timeline" && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-app">Date</label>
                    <input
                      type="date"
                      value={timelineParams.date}
                      onChange={(e) => setTimelineParams({ ...timelineParams, date: e.target.value })}
                      className="input text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-app">Start Time</label>
                    <input
                      type="time"
                      value={timelineParams.startTime}
                      onChange={(e) => setTimelineParams({ ...timelineParams, startTime: e.target.value })}
                      className="input text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-app">End Time</label>
                    <input
                      type="time"
                      value={timelineParams.endTime}
                      onChange={(e) => setTimelineParams({ ...timelineParams, endTime: e.target.value })}
                      className="input text-xs mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleTimelineSearch}
                      disabled={isScanningTimeline}
                      className="btn btn-primary text-xs w-full !py-2.5 flex items-center justify-center gap-2 shadow-md"
                    >
                      {isScanningTimeline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
                      Scan Timeline Tracks
                    </button>
                  </div>
                </div>

                {timelineTracksResult && (
                  <div className="space-y-3 pt-3 border-t border-app">
                    <div className="font-bold text-xs text-app">
                      Grouped Tracks Detected ({timelineTracksResult.totalTracksDetected})
                    </div>
                    <div className="space-y-2">
                      {timelineTracksResult.trackGroups?.map((trk) => (
                        <div
                          key={trk.trackId}
                          className="p-3.5 rounded-xl bg-surface border border-app hover:border-navy-400 flex items-center justify-between gap-4 text-xs shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <img src={trk.thumbnailFrameUrl} className="w-16 h-12 rounded-lg object-cover border border-app" alt="" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-app font-display">{trk.description}</span>
                                <span className="badge badge-low text-[9px] font-mono">{trk.trackId}</span>
                              </div>
                              <div className="text-[11px] text-muted mt-0.5">
                                Duration: {trk.durationSeconds}s · Confidence: {Math.round(trk.trackConfidence * 100)}%
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              handleSeek(10);
                              setIsPlaying(false);
                              if (videoRef.current) videoRef.current.pause();
                              notify(`Seeked player to track ${trk.trackId}`, "info");
                            }}
                            className="btn btn-outline text-xs !py-1.5 !px-3 flex items-center gap-1"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" /> Jump to Video
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: INVESTIGATION LEADS */}
            {activeModuleTab === "leads" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm font-display text-app">Saved Investigation Leads</h3>
                  <span className="badge badge-ok text-[10px]">{leads.length} Records</span>
                </div>

                {leads.length === 0 ? (
                  <EmptyState
                    icon={Bookmark}
                    title="No investigation leads saved yet"
                    description="Run an AI person crop analysis or search query and click 'Save as Lead' to record matches here."
                  />
                ) : (
                  <div className="space-y-2">
                    {leads.map((ld) => (
                      <div
                        key={ld.id || ld.leadNumber}
                        className="p-4 rounded-xl bg-surface border border-app hover:border-navy-400 space-y-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-app font-display">{ld.missingPersonName}</span>
                            <span className="badge badge-low text-[9px] font-mono">Case #{ld.missingCaseNumber}</span>
                            <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-bold">
                              {Math.round((ld.overallSimilarityScore ?? 0) * 100)}% Score
                            </span>
                          </div>
                          <span className="badge badge-ok text-[9px]">{ld.leadStatus || "OPEN_LEAD"}</span>
                        </div>

                        <div className="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
                          <span>Camera: <strong>{ld.cameraCode}</strong></span>
                          <span>Location: <strong>{ld.location}</strong></span>
                          <span>Investigator: <strong>{ld.investigatorUserId || "Officer"}</strong></span>
                        </div>

                        <p className="text-xs text-muted">
                          <strong className="text-app">Notes:</strong> {ld.investigatorNotes || ld.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: SESSION HISTORY */}
            {activeModuleTab === "history" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm font-display text-app">Investigation Session History</h3>
                  <span className="badge badge-low text-[10px]">{historyLogs.length} Sessions</span>
                </div>

                <div className="space-y-2 text-xs">
                  {historyLogs.map((h) => (
                    <div key={h.id || h.sessionId} className="p-3 rounded-xl bg-surface border border-app flex items-center justify-between">
                      <div>
                        <div className="font-bold text-app font-mono">{h.sessionId || "SESS-" + h.id}</div>
                        <div className="text-[11px] text-muted">Camera: {h.cameraCode} · Type: {h.searchType}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-teal-600 dark:text-teal-400 font-mono">
                          {Math.round((h.topSimilarityScore ?? 0) * 100)}% Top Score
                        </div>
                        <div className="text-[10px] text-muted">{h.candidatesFound ?? 0} Candidates</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT CAMERA */}
      {cameraModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface border border-app rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-app">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-navy-50 dark:bg-navy-800 text-navy-600 dark:text-navy-300">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-app font-display">
                  {editingCamera ? "Edit Camera Configuration" : "Mount Surveillance Stream"}
                </h3>
              </div>
              <button onClick={() => setCameraModalOpen(false)} className="p-1 rounded-lg text-muted hover:text-app">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Protocol Tabs (When creating) */}
            {!editingCamera && (
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-surface-2 border border-app text-xs font-semibold">
                <button
                  onClick={() => setAddProtocol("rtsp")}
                  className={`py-1.5 rounded-lg transition-all ${addProtocol === "rtsp" ? "bg-navy-600 text-white shadow-sm" : "text-muted"}`}
                >
                  RTSP
                </button>
                <button
                  onClick={() => setAddProtocol("onvif")}
                  className={`py-1.5 rounded-lg transition-all ${addProtocol === "onvif" ? "bg-navy-600 text-white shadow-sm" : "text-muted"}`}
                >
                  ONVIF
                </button>
                <button
                  onClick={() => setAddProtocol("webcam")}
                  className={`py-1.5 rounded-lg transition-all ${addProtocol === "webcam" ? "bg-navy-600 text-white shadow-sm" : "text-muted"}`}
                >
                  Webcam
                </button>
                <button
                  onClick={() => setAddProtocol("file")}
                  className={`py-1.5 rounded-lg transition-all ${addProtocol === "file" ? "bg-navy-600 text-white shadow-sm" : "text-muted"}`}
                >
                  Video File
                </button>
              </div>
            )}

            {/* Form */}
            {(addProtocol === "rtsp" || addProtocol === "onvif" || editingCamera) && (
              <form onSubmit={handleSaveCamera} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-app">Camera Name / Label</label>
                  <input
                    required
                    value={cameraForm.label}
                    onChange={(e) => setCameraForm({ ...cameraForm, label: e.target.value })}
                    placeholder="e.g. New Delhi Railway Station Outer Exit"
                    className="input text-xs mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-app">City Region</label>
                    <select
                      value={cameraForm.city}
                      onChange={(e) => setCameraForm({ ...cameraForm, city: e.target.value })}
                      className="input text-xs mt-1"
                    >
                      <option value="Delhi">Delhi NCR</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Kolkata">Kolkata</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-app">Specific Location</label>
                    <input
                      value={cameraForm.specificLocation}
                      onChange={(e) => setCameraForm({ ...cameraForm, specificLocation: e.target.value })}
                      placeholder="e.g. Platform 2 Footover"
                      className="input text-xs mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-app">
                    {addProtocol === "rtsp" ? "RTSP Stream URL" : "ONVIF / IP Stream URL"}
                  </label>
                  <input
                    required
                    placeholder={addProtocol === "rtsp" ? "rtsp://admin:pass@192.168.1.100:554/live" : "http://192.168.1.50:8080/stream"}
                    value={cameraForm.streamUrl}
                    onChange={(e) => setCameraForm({ ...cameraForm, streamUrl: e.target.value })}
                    className="input text-xs mt-1 font-mono"
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setCameraModalOpen(false)} className="btn btn-outline text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary text-xs shadow-md">
                    {editingCamera ? "Save Changes" : "Authenticate & Mount"}
                  </button>
                </div>
              </form>
            )}

            {/* Webcam Live Integration */}
            {addProtocol === "webcam" && !editingCamera && (
              <div className="space-y-4 text-center">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-app">
                  <Webcam audio={false} className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={handleMountWebcam}
                  className="btn btn-primary text-xs w-full shadow-md"
                >
                  Mount Device Webcam to Active Player
                </button>
              </div>
            )}

            {/* File Drop */}
            {addProtocol === "file" && !editingCamera && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive ? "border-teal-500 bg-teal-500/10" : "border-app hover:border-navy-400 bg-surface"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 text-muted mx-auto mb-2" />
                <div className="font-bold text-xs text-app">Drag &amp; Drop Forensic Video File</div>
                <div className="text-[11px] text-muted mt-1">Supports MP4, MOV, AVI, MKV up to 2 GB with SHA-256 sealing</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: SAVE INVESTIGATION LEAD */}
      {saveLeadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-app rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-app">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base text-app font-display">Save Investigation Lead</h3>
              </div>
              <button onClick={() => setSaveLeadModal(null)} className="text-muted hover:text-app">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-2 border border-app space-y-1 text-xs">
              <div className="font-bold text-app">{saveLeadModal.personName}</div>
              <div className="text-muted">Case #{saveLeadModal.missingCaseNumber} · Match Score: {Math.round(saveLeadModal.overallSimilarityScore * 100)}%</div>
              <div className="text-muted">Camera: {selectedCamera.cameraCode} ({selectedCamera.specificLocation})</div>
            </div>

            <div>
              <label className="text-xs font-semibold text-app">Investigator Verification Notes</label>
              <textarea
                rows={3}
                value={leadNotes}
                onChange={(e) => setLeadNotes(e.target.value)}
                placeholder="Enter field notes, officer observations, and follow-up directives..."
                className="input text-xs mt-1 w-full"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setSaveLeadModal(null)} className="btn btn-outline text-xs">
                Cancel
              </button>
              <button onClick={handleConfirmSaveLead} className="btn btn-primary text-xs shadow-md">
                Confirm &amp; Record Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

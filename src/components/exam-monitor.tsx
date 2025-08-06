"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Video, Loader2, AlertTriangle, CheckCircle2, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { analyzeBehavior, type AnalysisResult } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AnalysisStatus = "idle" | "suspicious" | "not-suspicious" | "error";

export default function ExamMonitor() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [headMovement, setHeadMovement] = useState("Looking around the room frequently.");
  const [contextualCues, setContextualCues] = useState("Candidate is alone in a quiet room, but seems to be looking at something off-screen.");
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        throw new Error("Media devices not supported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
      setHasCameraPermission(true);
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access the camera. Please check permissions and try again.",
      });
    }
  }, [toast]);
  
  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleToggleCamera = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraOn) return;

    setIsLoading(true);
    setLastAnalysis(null);
    setAnalysisStatus("idle");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      toast({ variant: "destructive", title: "Error", description: "Could not get canvas context." });
      setIsLoading(false);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const videoDataUri = canvas.toDataURL("image/jpeg");

    const result = await analyzeBehavior({
      videoDataUri,
      headMovementDescription: headMovement,
      contextualCues: contextualCues,
    });
    
    setLastAnalysis(result);

    if (result.error) {
      setAnalysisStatus("error");
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: result.error,
      });
    } else if (result.data) {
      if (result.data.isSuspicious) {
        setAnalysisStatus("suspicious");
        toast({
          variant: "destructive",
          title: "Suspicious Behavior Detected!",
          description: result.data.reason,
        });
      } else {
        setAnalysisStatus("not-suspicious");
        toast({
          title: "Analysis Complete",
          description: "No suspicious behavior was detected.",
        });
      }
    }
    setIsLoading(false);
  };

  const getStatusIcon = () => {
    switch (analysisStatus) {
      case "suspicious":
        return <AlertTriangle className="h-6 w-6 text-destructive" />;
      case "not-suspicious":
        return <CheckCircle2 className="h-6 w-6 text-primary" />;
      case "error":
        return <AlertTriangle className="h-6 w-6 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Camera className="text-primary" />
          Live Proctoring
        </CardTitle>
        <CardDescription>
          The system analyzes the video feed for suspicious behavior.
          Fill in the details below and click "Analyze Behavior".
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden border shadow-inner">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!isCameraOn && !hasCameraPermission && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 text-center">
                   <Alert variant="destructive" className="max-w-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Camera Access Required</AlertTitle>
                      <AlertDescription>
                          Please allow camera access to use this feature. You may need to grant permission in your browser settings.
                      </AlertDescription>
                  </Alert>
              </div>
            )}
            {!isCameraOn && hasCameraPermission && (
               <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <VideoOff className="h-16 w-16" />
                <p className="mt-2 font-medium">Camera is off</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Button onClick={handleToggleCamera} variant="outline" disabled={!hasCameraPermission}>
              {isCameraOn ? <VideoOff className="mr-2" /> : <Video className="mr-2" />}
              {isCameraOn ? "Stop Camera" : "Start Camera"}
            </Button>
            <Button onClick={handleAnalyze} disabled={!isCameraOn || isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2" />
              )}
              Analyze Behavior
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="head-movement">Head Movement Description</Label>
            <Textarea
              id="head-movement"
              placeholder="e.g., Looking down at lap repeatedly."
              value={headMovement}
              onChange={(e) => setHeadMovement(e.target.value)}
              rows={4}
              disabled={isLoading}
              className="resize-none"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contextual-cues">Contextual Cues</Label>
            <Textarea
              id="contextual-cues"
              placeholder="e.g., Muffled whispering sounds detected."
              value={contextualCues}
              onChange={(e) => setContextualCues(e.target.value)}
              rows={4}
              disabled={isLoading}
              className="resize-none"
            />
          </div>
        </div>
      </CardContent>
      {lastAnalysis && (
        <CardFooter>
          <div className="w-full">
            <h3 className="font-semibold text-lg mb-2 font-headline">Analysis Result</h3>
            <div className="border rounded-lg p-4 min-h-[100px] bg-muted/50 flex items-center justify-center">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Analyzing...</span>
                </div>
              ) : lastAnalysis.data ? (
                <div className="flex items-start gap-4">
                  {getStatusIcon()}
                  <div>
                    <p className={`font-bold ${lastAnalysis.data.isSuspicious ? 'text-destructive' : 'text-primary'}`}>
                      {lastAnalysis.data.isSuspicious ? "Suspicious" : "Not Suspicious"}
                    </p>
                    <p className="text-sm text-muted-foreground">{lastAnalysis.data.reason}</p>
                  </div>
                </div>
              ) : lastAnalysis.error ? (
                <div className="flex items-start gap-4">
                  {getStatusIcon()}
                  <div>
                    <p className="font-bold text-destructive">Error</p>
                    <p className="text-sm text-muted-foreground">{lastAnalysis.error}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Click "Analyze Behavior" to see results.</p>
              )}
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Video, Loader2, AlertTriangle, CheckCircle2, VideoOff, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { analyzeBehavior, type AnalysisResult } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type AnalysisEvent = {
  timestamp: string;
  isSuspicious: boolean;
  reason: string;
};

export default function ExamMonitor() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [headMovement, setHeadMovement] = useState("Looking around the room frequently.");
  const [contextualCues, setContextualCues] = useState("Candidate is alone in a quiet room, but seems to be looking at something off-screen.");
  const [analysisLog, setAnalysisLog] = useState<AnalysisEvent[]>([]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("getUserMedia not supported on this browser");
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Your browser does not support camera access.",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description: "Please enable camera permissions in your browser settings to use this app.",
      });
    }
  }, [toast]);
  
  useEffect(() => {
    startCamera();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, [startCamera]);

  const analyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !videoRef.current.srcObject) return;

    setIsAnalyzing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      toast({ variant: "destructive", title: "Error", description: "Could not get canvas context." });
      setIsAnalyzing(false);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const videoDataUri = canvas.toDataURL("image/jpeg");

    const result = await analyzeBehavior({
      videoDataUri,
      headMovementDescription: headMovement,
      contextualCues: contextualCues,
    });

    if (result.data) {
      const newEvent: AnalysisEvent = {
        timestamp: new Date().toLocaleTimeString(),
        isSuspicious: result.data.isSuspicious,
        reason: result.data.reason,
      };
      setAnalysisLog(prevLog => [newEvent, ...prevLog]);

      if (result.data.isSuspicious) {
        toast({
          variant: "destructive",
          title: "Suspicious Behavior Detected!",
          description: result.data.reason,
        });
      }
    } else if (result.error) {
       toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: result.error,
      });
    }

    setIsAnalyzing(false);
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      // Stop monitoring
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      setIsMonitoring(false);
    } else {
      // Start monitoring
      setAnalysisLog([]); // Clear previous logs
      analyzeFrame(); // Analyze immediately
      analysisIntervalRef.current = setInterval(analyzeFrame, 5000); // Analyze every 5 seconds
      setIsMonitoring(true);
    }
  };


  return (
    <Card className="w-full shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Camera className="text-primary" />
          Real-Time Proctoring
        </CardTitle>
        <CardDescription>
          The system continuously analyzes the video feed for suspicious behavior.
          Fill in the contextual details and start monitoring.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden border shadow-inner">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {!hasCameraPermission && (
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
            { hasCameraPermission && !(videoRef.current?.srcObject) && (
               <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <VideoOff className="h-16 w-16" />
                <p className="mt-2 font-medium">Camera is off</p>
              </div>
            )}
          </div>

          <Button onClick={toggleMonitoring} disabled={!hasCameraPermission || (isAnalyzing && !isMonitoring)}>
            {isMonitoring ? (
              isAnalyzing ? (
                 <Loader2 className="mr-2 animate-spin" />
              ) : (
                 <Square className="mr-2" />
              )
            ) : (
              <Play className="mr-2" />
            )}
            {isMonitoring ? (isAnalyzing ? "Analyzing..." : "Stop Monitoring") : "Start Monitoring"}
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="head-movement">Head Movement Description (Optional)</Label>
            <Textarea
              id="head-movement"
              placeholder="e.g., Looking down at lap repeatedly."
              value={headMovement}
              onChange={(e) => setHeadMovement(e.target.value)}
              rows={4}
              disabled={isMonitoring}
              className="resize-none"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contextual-cues">Contextual Cues (Optional)</Label>
            <Textarea
              id="contextual-cues"
              placeholder="e.g., Muffled whispering sounds detected."
              value={contextualCues}
              onChange={(e) => setContextualCues(e.target.value)}
              rows={4}
              disabled={isMonitoring}
              className="resize-none"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
          <div className="w-full">
            <h3 className="font-semibold text-lg mb-2 font-headline">Monitoring Log</h3>
            <ScrollArea className="h-48 w-full rounded-md border bg-muted/50 p-4">
              {analysisLog.length === 0 ? (
                 <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>
                      {isMonitoring ? "Waiting for first analysis..." : "Start monitoring to see the event log."}
                    </p>
                 </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {analysisLog.map((event, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <span className="font-mono text-xs text-muted-foreground pt-0.5">{event.timestamp}</span>
                      <Badge variant={event.isSuspicious ? "destructive" : "secondary"} className="whitespace-nowrap">
                        {event.isSuspicious ? "Suspicious" : "Normal"}
                      </Badge>
                      <p className="text-muted-foreground">{event.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </CardFooter>
    </Card>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    initializeCamera();
    
    return () => {
      // Cleanup: detener la cámara cuando el componente se desmonte
      stopCamera();
    };
  }, []);

  const initializeCamera = async () => {
    try {
      setIsLoading(true);
      setError('');
      setPermissionDenied(false);

      // Verificar si el navegador soporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Tu navegador no soporta el acceso a la cámara');
        setIsLoading(false);
        return;
      }

      // Solicitar permisos de cámara
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        },
        audio: false
      });

      setStream(mediaStream);
      
      // Esperar a que el video esté listo
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Esperar a que el video cargue metadata
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setIsLoading(false);
            })
            .catch((err) => {
              console.error('Error playing video:', err);
              setError('Error al iniciar la vista previa de la cámara');
              setIsLoading(false);
            });
        };
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setIsLoading(false);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No se encontró ninguna cámara conectada a tu dispositivo.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('La cámara está siendo usada por otra aplicación. Por favor, cierra otras aplicaciones que puedan estar usando la cámara.');
      } else {
        setError(`Error al acceder a la cámara: ${err.message || 'Error desconocido'}`);
      }
      
      toast({
        title: 'Error de cámara',
        description: error || 'No se pudo acceder a la cámara',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: 'Error',
        description: 'No se pudo capturar la foto',
        variant: 'destructive',
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      toast({
        title: 'Error',
        description: 'No se pudo procesar la imagen',
        variant: 'destructive',
      });
      return;
    }

    // Establecer dimensiones del canvas según el video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Obtener la imagen como data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageDataUrl);

    // Pausar el video
    video.pause();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const confirmCapture = () => {
    if (!canvasRef.current) return;

    // Convertir canvas a blob
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File(
          [blob], 
          `confirmacion_${Date.now()}.jpg`, 
          { type: 'image/jpeg' }
        );
        stopCamera();
        onCapture(file);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo procesar la imagen capturada',
          variant: 'destructive',
        });
      }
    }, 'image/jpeg', 0.95);
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Iniciando cámara...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 p-4">
            <Alert variant="destructive" className="max-w-md">
              <AlertDescription className="space-y-2">
                <p>{error}</p>
                {!permissionDenied && (
                  <Button onClick={initializeCamera} size="sm" variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reintentar
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {capturedImage ? (
          <img 
            src={capturedImage} 
            alt="Foto capturada" 
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay con guías visuales */}
        {!capturedImage && !isLoading && !error && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-4 border-primary/30 m-8 rounded-lg"></div>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white text-sm bg-black/50 inline-block px-3 py-1 rounded">
                Posiciona el documento de confirmación dentro del marco
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={handleCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>

        {capturedImage ? (
          <>
            <Button type="button" variant="outline" onClick={retakePhoto}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Volver a tomar
            </Button>
            <Button type="button" onClick={confirmCapture}>
              <Camera className="h-4 w-4 mr-2" />
              Confirmar foto
            </Button>
          </>
        ) : (
          <Button 
            type="button" 
            onClick={capturePhoto}
            disabled={isLoading || !!error}
          >
            <Camera className="h-4 w-4 mr-2" />
            Capturar foto
          </Button>
        )}
      </div>
    </div>
  );
}

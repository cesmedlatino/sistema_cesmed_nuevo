
import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';

interface FooterEditorProps {
  footerConfig: {
    signature_url?: string;
    text?: string;
  };
  onChange: (config: { signature_url?: string; text?: string }) => void;
}

export function FooterEditor({ footerConfig, onChange }: FooterEditorProps) {
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a URL for the file for preview
      const imageUrl = URL.createObjectURL(file);
      onChange({ ...footerConfig, signature_url: imageUrl });
    }
  };

  const removeSignature = () => {
    onChange({ ...footerConfig, signature_url: undefined });
    if (signatureInputRef.current) {
      signatureInputRef.current.value = '';
    }
  };

  const handleSignatureClick = () => {
    signatureInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pie de Página</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="signature">Firma Digital</Label>
          <div className="mt-2">
            {footerConfig.signature_url ? (
              <div className="flex items-center gap-2">
                <div className="w-32 h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src={footerConfig.signature_url} 
                    alt="Firma" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={removeSignature}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  ref={signatureInputRef}
                  type="file"
                  id="signature"
                  accept="image/*"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={handleSignatureClick}>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Firma
                </Button>
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="footerText">Texto del Pie</Label>
          <Textarea
            id="footerText"
            value={footerConfig.text || ''}
            onChange={(e) => onChange({ ...footerConfig, text: e.target.value })}
            placeholder="Texto que aparecerá después de la firma (ej: Dr. Juan Pérez - Médico Especialista)"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}

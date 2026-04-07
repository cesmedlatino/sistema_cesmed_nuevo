import { useState } from 'react';
import { PinturaEditorModal } from '@pqina/react-pintura';

// pintura
import '@pqina/pintura/pintura.css';
import {
  // editor
  locale_en_gb,
  createDefaultImageReader,
  createDefaultImageWriter,
  createDefaultShapePreprocessor,

  // plugins
  setPlugins,
  plugin_crop,
  plugin_crop_locale_en_gb,
  plugin_finetune,
  plugin_finetune_locale_en_gb,
  plugin_finetune_defaults,
  plugin_filter,
  plugin_filter_locale_en_gb,
  plugin_filter_defaults,
  plugin_annotate,
  plugin_annotate_locale_en_gb,
  markup_editor_defaults,
  markup_editor_locale_en_gb,
} from '@pqina/pintura';

setPlugins(plugin_crop, plugin_finetune, plugin_filter, plugin_annotate);

const editorDefaults = {
  imageReader: createDefaultImageReader(),
  imageWriter: createDefaultImageWriter(),
  shapePreprocessor: createDefaultShapePreprocessor(),
  ...plugin_finetune_defaults,
  ...plugin_filter_defaults,
  ...markup_editor_defaults,
  locale: {
    ...locale_en_gb,
    ...plugin_crop_locale_en_gb,
    ...plugin_finetune_locale_en_gb,
    ...plugin_filter_locale_en_gb,
    ...plugin_annotate_locale_en_gb,
    ...markup_editor_locale_en_gb,
  },
};

interface PinturaImageEditorProps {
  imageUrl?: string;
  onSave?: (blob: Blob) => void;
  className?: string;
}

export const PinturaImageEditor = ({ imageUrl, onSave, className = "" }: PinturaImageEditorProps) => {
  const [isEditorOpen, setIsEditorOpen] = useState(!!imageUrl);

  const handleProcess = ({ dest }: any) => {
    if (onSave && dest) {
      // Convert canvas to blob or use blob directly
      if (dest instanceof HTMLCanvasElement) {
        dest.toBlob((blob: Blob | null) => {
          if (blob) {
            onSave(blob);
          }
        }, 'image/png');
      } else if (dest instanceof Blob) {
        onSave(dest);
      }
    }
    setIsEditorOpen(false);
  };

  const handleHide = () => {
    setIsEditorOpen(false);
  };

  if (!isEditorOpen || !imageUrl) {
    return null;
  }

  return (
    <div className={className}>
      <PinturaEditorModal
        {...editorDefaults}
        src={imageUrl}
        utils={['crop', 'finetune', 'filter', 'annotate']}
        onProcess={handleProcess}
        onHide={handleHide}
        onLoad={(res: any) => console.log('Image loaded in editor', res)}
      />
    </div>
  );
};
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadFile } from '@/utils/api';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Upload, FileImage } from 'lucide-react';

export function MediaUpload({ onUpload, token }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (file) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await uploadFile('/upload', formData, token, {
        errorMessage: 'Upload failed'
      });

      if (data) {
        onUpload(data.mediaId);
        setFile(null);
      }
      setUploading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex gap-3 items-center p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="flex-1 relative group"
        whileTap={{ scale: 0.99 }}
      >
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
          <FileImage className="h-4 w-4" />
        </div>
        <Input
          type="file"
          accept="video/*,image/*"
          onChange={(e) => setFile(e.target.files[0])}
          required
          className="pl-10 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all bg-background/50"
        />
      </motion.div>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button type="submit" disabled={uploading} className="gap-2 shadow-md shadow-primary/20">
          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Upload className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </motion.div>
    </motion.form>
  );
}

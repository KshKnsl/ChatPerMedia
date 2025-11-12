import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadFile } from '@/utils/api';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Upload } from 'lucide-react';

export function MediaUpload({ onUpload, token }) 
{
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
      className="flex gap-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="flex-1"
        whileTap={{ scale: 0.98 }}
      >
        <Input
          type="file"
          accept="video/*,image/*"
          onChange={(e) => setFile(e.target.files[0])}
          required
          className="flex-1 transition-all focus:ring-2"
        />
      </motion.div>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button type="submit" disabled={uploading} className="gap-2">
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
          {uploading ? 'Uploading...' : 'Send Media'}
        </Button>
      </motion.div>
    </motion.form>
  );
}

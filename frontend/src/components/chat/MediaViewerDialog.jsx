import { useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, X, Forward } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function MediaViewerDialog({ open, onOpenChange, selectedMedia, provenance, loadingProvenance, onFetchProvenance, onRequestForward }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;

      if (e.key === 'Escape') {
        onOpenChange(false);
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onFetchProvenance?.();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onOpenChange, onFetchProvenance]);

  const filteredDistributionPath = (provenance?.distributionPath || []).filter((entry) => {
    if (!selectedMedia?.timestamp) return true;
    try {
      return new Date(entry.sharedAt) <= new Date(selectedMedia.timestamp);
    } catch (e) {
      return true;
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden bg-black/95 border-white/10 shadow-2xl backdrop-blur-xl">
        <DialogTitle className="sr-only">Media Viewer</DialogTitle>
        <DialogDescription className="sr-only">View shared media with provenance information</DialogDescription>

        <div className="relative w-full flex flex-col h-[85vh]">
          <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex gap-2">
              {selectedMedia?.mediaId && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <Button
                    onClick={() => onFetchProvenance(selectedMedia.mediaId)}
                    disabled={loadingProvenance}
                    size="sm"
                    variant="secondary"
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all"
                    title="Check Provenance (Press P)"
                  >
                    {loadingProvenance ? <span className="h-4 w-4 animate-spin" /> : <><Shield className="h-4 w-4 mr-2" />Provenance</>}
                  </Button>
                </motion.div>
              )}
              {selectedMedia && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <Button
                    onClick={() => {
                      try {
                        onRequestForward?.(selectedMedia);
                      } catch (e) {
                      }
                    }}
                    size="sm"
                    variant="ghost"
                    className="bg-white/5 text-white border border-white/10 backdrop-blur-md transition-all"
                    title="Forward media"
                  >
                    <Forward className="h-4 w-4 mr-2" />Forward
                  </Button>
                </motion.div>
              )}
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center bg-black/40 relative overflow-hidden">
            {selectedMedia && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative max-w-full max-h-full flex items-center justify-center p-4"
              >
                {selectedMedia.type === 'video' ? (
                  <video
                    src={selectedMedia.url}
                    controls
                    autoPlay
                    className="max-w-full max-h-[60vh] rounded-lg shadow-2xl ring-1 ring-white/10"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <img
                    src={selectedMedia.url}
                    alt="Media viewer"
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                )}
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {provenance && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 p-6 max-h-[35vh] overflow-y-auto"
              >
                <div className="max-w-3xl mx-auto space-y-6">

                  {provenance && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
                        <Shield className="h-5 w-5 text-green-400" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
                          Provenance Chain
                        </span>
                      </h3>

                      <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-white/5 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">
                            {provenance.creator.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">Original Uploader</div>
                            <div className="text-xs text-white/50">
                              {provenance.creator.username} • {new Date(provenance.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {filteredDistributionPath.length > 0 ? (
                          <div className="p-4 bg-black/20 space-y-4">
                            <div className="text-xs font-medium text-white/40 uppercase tracking-wider">Distribution Path</div>
                            <div className="space-y-0 relative">
                              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-white/10"></div>
                              {filteredDistributionPath.map((entry, idx) => (
                                <div key={idx} className="relative pl-6 py-2">
                                  <div className="absolute left-[5px] top-3.5 w-2 h-2 rounded-full bg-primary ring-4 ring-black"></div>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                                    <span className="font-medium text-white/90">{entry.from?.username || 'Unknown'}</span>
                                    <span className="text-white/40 text-xs">shared with</span>
                                    <span className="font-medium text-white/90">{entry.recipient?.username || 'Unknown'}</span>
                                    <span className="text-white/30 text-xs ml-auto">
                                      {new Date(entry.sharedAt).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 text-center text-sm text-white/40 italic">
                            No distribution history found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

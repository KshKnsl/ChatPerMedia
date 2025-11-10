import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Info } from 'lucide-react';

export function MediaViewerDialog({ open, onOpenChange, selectedMedia, provenance, loadingProvenance, onFetchProvenance }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-black/95">
        <DialogTitle className="sr-only">Media Viewer</DialogTitle>
        <DialogDescription className="sr-only">View shared media with provenance information</DialogDescription>
        <div className="relative w-full h-[90vh] flex flex-col">
          {selectedMedia?.mediaId && (
            <div className="absolute top-4 right-4 z-10">
              <Button 
                onClick={() => onFetchProvenance(selectedMedia.mediaId)} 
                disabled={loadingProvenance} 
                size="sm" 
                variant="secondary" 
                className="bg-black/70 hover:bg-black/90 text-white border border-white/20"
              >
                {loadingProvenance ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Shield className="h-4 w-4 mr-2" />Provenance</>}
              </Button>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center p-4">
            {selectedMedia && (
              <>
                {selectedMedia.type === 'video' ? (
                  <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-full rounded-lg" onContextMenu={(e) => e.preventDefault()} />
                ) : selectedMedia.type === 'audio' ? (
                  <div className="w-full max-w-2xl">
                    <audio src={selectedMedia.url} controls autoPlay className="w-full" onContextMenu={(e) => e.preventDefault()} />
                  </div>
                ) : (
                  <img src={selectedMedia.url} alt="Media viewer" className="max-w-full max-h-full object-contain rounded-lg" onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} />
                )}
                {selectedMedia.sender && selectedMedia.type !== 'audio' && (
                  <div className="absolute inset-0 bg-white bg-opacity-20 flex items-center justify-center pointer-events-none text-3xl md:text-5xl font-bold text-red-600">
                    {selectedMedia.sender}
                  </div>
                )}
              </>
            )}
          </div>

          {provenance && (
            <div className="bg-card border-t p-4 max-h-[40vh] overflow-y-auto">
              <div className="space-y-3 text-sm">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />Media Provenance
                </h3>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Original Uploader</div>
                    <div className="text-muted-foreground">{provenance.creator.username} ({provenance.creator.email})</div>
                    <div className="text-xs text-muted-foreground">Uploaded: {new Date(provenance.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                
                {provenance.forensicEmbeds?.length > 0 && (
                  <div className="mt-3">
                    <div className="font-medium mb-2">Shared With ({provenance.forensicEmbeds.length})</div>
                    <div className="space-y-2">
                      {provenance.forensicEmbeds.map((embed, idx) => (
                        <div key={idx} className="pl-4 border-l-2 border-primary/30 text-xs">
                          <div>{embed.recipient?.username || 'Unknown'} ({embed.recipient?.email || 'N/A'})</div>
                          <div className="text-muted-foreground">{new Date(embed.createdAt).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

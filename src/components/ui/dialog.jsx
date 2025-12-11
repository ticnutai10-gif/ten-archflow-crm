import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/components/utils/cn"

const Dialog = ({ open, onOpenChange, children }) => {
  // טיפול ב-ESC
  React.useEffect(() => {
    if (open) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onOpenChange?.(false);
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay - לחיצה עליו סוגרת */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      {/* Content */}
      {children}
    </div>
  );
};

const DialogTrigger = React.forwardRef(({ className, children, asChild, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref,
      ...props,
      ...children.props
    });
  }

  return (
    <button
      ref={ref}
      className={cn(className)}
      {...props}
    >
      {children}
    </button>
  );
});
DialogTrigger.displayName = "DialogTrigger"

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed z-[100] bg-white rounded-xl shadow-2xl w-auto min-w-[400px] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col",
      className
    )}
    style={{
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      animation: 'dialogSlideIn 0.25s ease-out'
    }}
    onClick={(e) => e.stopPropagation()}
    {...props}
  >
    {children}
  </div>
));
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-right px-6 pt-6 pb-4 border-b border-slate-200", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-row justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-xl font-bold text-slate-900 leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-500", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription"

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
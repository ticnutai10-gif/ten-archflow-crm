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
      "fixed z-50 bg-white rounded-xl shadow-2xl p-6 w-auto min-w-[400px] max-w-2xl max-h-[90vh] overflow-y-auto",
      "top-[50%] left-[50%]",
      className
    )}
    style={{
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
    className={cn("flex flex-col space-y-1.5 text-center sm:text-right", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
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
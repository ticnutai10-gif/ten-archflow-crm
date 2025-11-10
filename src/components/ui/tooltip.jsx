import * as React from "react"

const TooltipProvider = ({ children }) => {
  return <>{children}</>;
};

const Tooltip = ({ children, open, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  return (
    <div className="relative inline-block">
      {React.Children.map(children, child => {
        if (child?.type?.displayName === 'TooltipTrigger') {
          return React.cloneElement(child, {
            onMouseEnter: handleOpen,
            onMouseLeave: handleClose,
            onFocus: handleOpen,
            onBlur: handleClose
          });
        }
        if (child?.type?.displayName === 'TooltipContent' && (isOpen || open)) {
          return child;
        }
        return null;
      })}
    </div>
  );
};

const TooltipTrigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ref, ...props });
  }
  return (
    <button ref={ref} type="button" {...props}>
      {children}
    </button>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef(({ children, className = "", side = "top", align = "center", ...props }, ref) => {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };

  return (
    <div
      ref={ref}
      className={`absolute ${positionClasses[side]} z-50 px-3 py-2 text-sm text-white bg-slate-900 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in-0 zoom-in-95 ${className}`}
      {...props}
    >
      {children}
      <div className={`absolute w-2 h-2 bg-slate-900 transform rotate-45 ${
        side === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
        side === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
        side === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
        'left-[-4px] top-1/2 -translate-y-1/2'
      }`} />
    </div>
  );
});
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
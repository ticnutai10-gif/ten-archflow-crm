import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const AccordionContext = React.createContext({
  openItems: [],
  toggleItem: () => {}
});

const Accordion = React.forwardRef(({ children, type = "single", collapsible = false, className, ...props }, ref) => {
  const [openItems, setOpenItems] = React.useState([]);

  const toggleItem = (value) => {
    if (type === "single") {
      setOpenItems(prev => {
        if (prev.includes(value)) {
          return collapsible ? [] : prev;
        }
        return [value];
      });
    } else {
      setOpenItems(prev => {
        if (prev.includes(value)) {
          return prev.filter(item => item !== value);
        }
        return [...prev, value];
      });
    }
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
});
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef(({ className, value, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("border-b", className)} data-value={value} {...props}>
      {children}
    </div>
  );
});
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const { openItems, toggleItem } = React.useContext(AccordionContext);
  const itemElement = ref?.current?.closest('[data-value]');
  const value = itemElement?.getAttribute('data-value') || '';
  const isOpen = openItems.includes(value);

  const handleClick = () => {
    const valueToToggle = ref?.current?.closest('[data-value]')?.getAttribute('data-value') || '';
    if (valueToToggle) {
      toggleItem(valueToToggle);
    }
  };

  return (
    <div className="flex">
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown 
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>
    </div>
  );
});
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const { openItems } = React.useContext(AccordionContext);
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const itemElement = ref?.current?.closest('[data-value]');
  const value = itemElement?.getAttribute('data-value') || '';
  const isOpen = openItems.includes(value);

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden text-sm transition-all duration-200",
        isOpen ? "animate-accordion-down" : "animate-accordion-up hidden"
      )}
      {...props}
    >
      <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </div>
  );
});

AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }